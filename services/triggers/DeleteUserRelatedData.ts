/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { deleteS3Objects, deleteRecords } from "./shared/Delete";
import { extractThreadDetails } from "./shared/ExtractThreadDetails";

const dynamo = new AWS.DynamoDB.DocumentClient();
const userPool = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });
const pinpoint = new AWS.Pinpoint();

let USER_POOL_ID;

interface IAmazonString {
    S: string;
}

interface IRecord {
    dynamodb: {
        OldImage?: {
            userId: IAmazonString;
        };
    };
    eventName: string;
}

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        throw new Error("Event lacks Records");
    }
    console.log("Event records", event.Records.length);

    if (!USER_POOL_ID) {
        const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
        USER_POOL_ID = resp.Parameter.Value;
    }

    for (const record of event.Records as IRecord[]) {
        if (record.eventName !== "REMOVE") {
            continue;
        }

        const { userId } = record.dynamodb.OldImage!;

        const p1 = deleteUserPosts(userId.S);
        const p2 = deleteUserFollowing(userId.S);
        const p3 = deleteUserFollowers(userId.S);
        const p4 = deleteUserPoolsUser(userId.S);
        const p5 = deleteBlocksFromUser(userId.S);
        const p6 = deleteBlocksOfUser(userId.S);
        const p7 = deleteProfilePic(userId.S);
        const p8 = deletePinpointEndpoints(userId.S);
        const p9 = deleteCourtMembers(userId.S);
        const p10 = deleteCourts(userId.S);
        const p11 = deleteUserMessages(userId.S);
        const p12 = deleteUserBounzes(userId.S);
        await Promise.all([p1, p2, p3, p4, p5, p6, p7, p8, p9, p10, p11, p12]);
    }

    // TODO: roll back if errors

    console.log("Completed");
}

async function deletePinpointEndpoints(userId: string) {
    console.log('Deleting pinpoint endpoints for: ', userId);

    const params = {
        ApplicationId: process.env.PINPOINT_APP_ID,
        UserId: userId,
    }

    const res = await pinpoint.deleteUserEndpoints(params).promise();
    console.log('pinpoint result', res);
    return res;
}

async function deleteUserPoolsUser(Username: string) {
    console.log("Deleting User Pools user: ", Username);

    const params = {
        UserPoolId: USER_POOL_ID,
        Username
    };

    try {
        await userPool.adminDeleteUser(params).promise();
    } catch (e) {
        if (e.code === 'UserNotFoundException') {
            console.log('User pool did not contain user');
        } else {
            throw e;
        }
    }

    console.log('Done deleting user pool user');
}

async function getBlocksFromUser(userId: string, LastEvaluatedKey: any) {
    const params = {
        TableName: process.env.BLOCKED_USERS_TABLE,
        KeyConditionExpression: "blockerId = :i",
        ExpressionAttributeValues: {
            ":i": userId
        },
        LastEvaluatedKey
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getBlocksOfUser(userId: string, LastEvaluatedKey: any) {
    const params = {
        TableName: process.env.BLOCKED_USERS_TABLE,
        IndexName: "blockeeId-index",
        KeyConditionExpression: "blockeeId = :i",
        ExpressionAttributeValues: {
            ":i": userId
        },
        LastEvaluatedKey
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteBlocksFromUser(userId: string) {
    console.log("Deleting all blocks from: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getBlocksFromUser(
            userId,
            lastKey
        );
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.BLOCKED_USERS_TABLE);
    } while (lastKey);

    console.log('Done deleting blocks from user');
}

async function getUserBounzes(userId: string, LastEvaluatedKey: any) {
    const params = {
        TableName: process.env.BOUNZES_TABLE,
        KeyConditionExpression: "bounzerId = :i",
        ProjectionExpression: "bounzerId, postId",
        ExpressionAttributeValues: {
            ":i": userId
        },
        LastEvaluatedKey
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteUserBounzes(userId: string) {
    console.log("Deleting all bounzes from: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getUserBounzes(
            userId,
            lastKey
        );
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.BOUNZES_TABLE);
    } while (lastKey);

    console.log('Done deleting blocks from user');
}

async function deleteBlocksOfUser(userId: string) {
    console.log("Deleting all blocks of: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getBlocksOfUser(
            userId,
            lastKey
        )!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.BLOCKED_USERS_TABLE);
    } while (lastKey);

    console.log('Done deleting blocks of user');
}

async function getUserSentPosts(creatorId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        ProjectionExpression: "creatorId, postedDate",
        KeyConditionExpression: "creatorId = :i",
        ExpressionAttributeValues: {
            ":i": creatorId
        },
        ExclusiveStartKey,
        Limit: 25
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteUserPosts(creatorId: string) {
    console.log("Deleting all posts related to: ", creatorId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getUserSentPosts(
            creatorId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.SENT_POSTS_TABLE);
    } while (lastKey);

    console.log('Done deleting user posts');
}

async function getFollowersForUser(followeeId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.FOLLOWERS_TABLE,
        IndexName: "followeeId-index",
        ExclusiveStartKey,
        Limit: 25,
        KeyConditionExpression: "followeeId = :i",
        ExpressionAttributeValues: {
            ":i": followeeId
        }
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getFollowingForUser(followerId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.FOLLOWERS_TABLE,
        ExclusiveStartKey,
        Limit: 25,
        KeyConditionExpression: "followerId = :i",
        ExpressionAttributeValues: {
            ":i": followerId
        }
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getCourtsForUser(ownerId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.COURT_INFO_TABLE,
        IndexName: 'ownerId-index',
        ProjectionExpression: 'courtId',
        ExclusiveStartKey,
        Limit: 25,
        KeyConditionExpression: 'ownerId = :i',
        ExpressionAttributeValues: {
            ':i': ownerId
        }
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getCourtMembersForUser(memberId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.COURT_MEMBERS_TABLE,
        IndexName: 'memberId-index',
        KeyConditionExpression: 'memberId = :i',
        ExpressionAttributeValues: {
            ':i': memberId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getMessageThreadsForUser(userId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.MESSAGE_THREADS_TABLE,
        ProjectionExpression: 'userId, threadId',
        KeyConditionExpression: 'userId = :i',
        ExpressionAttributeValues: {
            ':i': userId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getThreadMessages(threadId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        ProjectionExpression: 'threadId, messageDate',
        KeyConditionExpression: 'threadId = :i',
        ExpressionAttributeValues: {
            ':i': threadId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteUserFollowers(userId: string) {
    console.log("Deleting all followers for: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getFollowersForUser(
            userId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.FOLLOWERS_TABLE);
    } while (lastKey);

    console.log('Done deleting user followers');
}

async function deleteUserFollowing(userId: string) {
    console.log("Deleting all following for: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getFollowingForUser(
            userId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.FOLLOWERS_TABLE);
    } while (lastKey);

    console.log('Done deleting user following');
}

async function deleteCourtMembers(userId: string) {
    console.log("Deleting all court member entries for: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getCourtMembersForUser(
            userId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.COURT_MEMBERS_TABLE);
    } while (lastKey);

    console.log('Done deleting court members');
}

async function deleteCourts(userId: string) {
    console.log("Deleting all courts owned by: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getCourtsForUser(
            userId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.COURT_INFO_TABLE);
    } while (lastKey);

    console.log('Done deleting courts');
}

async function deleteThreadMessages(threadId: string) {
    console.log("Deleting all messages in thread: ", threadId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getThreadMessages(
            threadId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.MESSAGES_TABLE);
    } while (lastKey);
}

async function deleteUserMessages(userId: string) {
    console.log("Deleting all messages pertaining to: ", userId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = (await getMessageThreadsForUser(
            userId,
            lastKey
        ))!;
        lastKey = LastEvaluatedKey;

        // We are getting the list of MessageThread records related to the one user and
        // will thus have to derive the list related to the other user
        let items1 = [];
        let items2 = [];

        let ps = [];
        for (const item of items) {
            ps.push(deleteThreadMessages(item.threadId));

            const thread = extractThreadDetails(item.threadId);
            if (!thread.userIdA || !thread.userIdB) {
                throw new Error('Unexpected thread type');
            }

            items1.push({ threadId: item.threadId, userId: thread.userIdA });
            items2.push({ threadId: item.threadId, userId: thread.userIdB });
        }

        ps.push(deleteRecords(items1, process.env.MESSAGE_THREADS_TABLE));
        ps.push(deleteRecords(items2, process.env.MESSAGE_THREADS_TABLE));

        await Promise.all(ps);
    } while (lastKey);

    console.log('Done deleting user messages');
}

async function deleteProfilePic(userId: string) {
    await deleteS3Objects(
        process.env.PUBLIC_IMAGES_BUCKET,
        `profile-pics/${userId}`
    );

    console.log('Done deleting profile pic');
}
