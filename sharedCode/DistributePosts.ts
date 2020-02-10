/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from 'aws-sdk';
import RunAppSyncQuery from './RunAppSyncQuery';
import * as mutations from './graphql/mutations';
import { checkBlocked, checkIgnored } from './CheckBlocked';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function getFollowers(followeeId: string, ExclusiveStartKey: any) {
    const params = {
        TableName: process.env.FOLLOWERS_TABLE,
        IndexName: 'followeeId-index',
        KeyConditionExpression: 'followeeId = :i',
        ExpressionAttributeValues: {
            ':i': followeeId,
        },
        ExclusiveStartKey,
    };

    return await dynamo.query(params).promise();
}


async function createReceivedPost(receiverId: string, postId: string, receivedDate: string, courtId?: string) {
    const creatorId = postId.split(';')[0];
    if (await checkBlocked(creatorId, receiverId)) {
        console.log(`Skipped receiver ${receiverId} because blocked by creator ${creatorId}`);
        return;
    } else if (await checkBlocked(receiverId, creatorId)) {
        console.log(`Skipped receiver ${receiverId} because they blocked creator ${creatorId}`);
        return;
    } else if (courtId && await checkIgnored(receiverId, courtId)) {
        console.log(`Skipped receiver ${receiverId} because they ignored court ${courtId}`);
        return;
    }

    const input = {
        receiverId,
        postId,
        receivedDate,
    };

    const result = await RunAppSyncQuery(mutations.createReceivedPost, "CreateReceivedPost", {
        input
    });
    console.log("result", result);
    return result !== 'ConditionalCheckFailed';
}

export async function spreadToFollowers(creatorId: string, postedDate: string, courtId?: string, bounzerId?: string, bounzedDate?: string) {
    const postId = creatorId + ';' + postedDate;
    let receipts = 0;

    // The AppSync requests can be parallelized into batches to speed up the Lambda
    let waits = [];
    const flushWaits = async () => {
        const results = await Promise.all(waits);

        for (const result of results) {
            if (result === true) {
                receipts++;
            }
        }

        waits = [];
    }

    let lastKey: any;
    do {
        const { Items, LastEvaluatedKey } = await getFollowers(bounzerId || creatorId, lastKey);
        lastKey = LastEvaluatedKey;

        for (const item of Items) {
            if (!item.followerId) {
                throw new Error('Item lacks followerId');
            }

            if (waits.length < 10) {
                waits.push(createReceivedPost(item.followerId, postId, bounzedDate || postedDate, courtId));
            } else {
                await flushWaits();
            }
        }
    } while (lastKey);

    waits.push(createReceivedPost(bounzerId || creatorId, postId, bounzedDate || postedDate, courtId));
    await flushWaits();

    console.log('Post spread to followers');
    return receipts;
}

export async function incrementSentPostBounty(creatorId: string, postedDate: string, count: number) {
    const input = {
        creatorId,
        postedDate,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementSentPostBounty, "IncrementSentPostBounty", {
        input
    });
    console.log("result", result);
    return result.incrementSentPostBounty;
}

export async function incrementUserBounty(userId: string, count: number) {
    const input = {
        userId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementUserBounty, "IncrementUserBounty", {
        input
    });
    console.log("result", result);
    return result;
}

export async function distributeBounty(creatorId: string, postedDate: string, bounzerId: string, bounty: number) {
    await incrementSentPostBounty(creatorId, postedDate, -bounty);
    console.log('Bounty removed from post');
    await incrementUserBounty(bounzerId, bounty);
    console.log('Bounty added to user');
}
