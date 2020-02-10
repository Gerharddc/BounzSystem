/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';
import * as twitter from 'twitter-text';
import { getFollowers } from './shared/DistributePosts';
import { checkIgnored } from './shared/CheckBlocked';
import { extractMentions } from './shared/ExtractMentions';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    for (const record of event.Records) {
        if (record.eventName !== 'INSERT') {
            console.log('Non-insert event ignored', record);
            continue;
        }

        console.log('record', JSON.stringify(record));

        if (!record.dynamodb.NewImage.caption) {
            continue;
        }

        const caption = record.dynamodb.NewImage.caption.S;
        const creatorId = record.dynamodb.NewImage.creatorId.S;
        const postId = creatorId + ';' + record.dynamodb.NewImage.postedDate.S;
        const courtId = record.dynamodb.NewImage.courtId ? record.dynamodb.NewImage.courtId.S : undefined;
        
        const mentions = extractMentions(caption);
        const receiverIds = mentions.users;
        const creator = await getUserInfo(creatorId);

        const title1 = `${creator.username} mentioned you in a post`;
        const body1 = mentions.newText;
        const deeplink = `bounz://post/${postId}`;

        for (const receiverId of receiverIds) {
            await SendDeepLink(receiverId, title1, body1, deeplink);
            console.log('Notified', receiverId);
        }

        const title2 = `New post from ${creator.username}`;
        const body2 = mentions.newText;


        let lastKey: any;
        do {
            const { Items, LastEvaluatedKey } = await getFollowers(creatorId, lastKey);
            lastKey = LastEvaluatedKey;

            for (const item of Items) {
                if (!item.followerId) {
                    throw new Error('Item lacks followerId: ' + item);
                }

                if (courtId && await checkIgnored(item.followerId, courtId)) {
                    console.log(`Skipped ${item.followerId} because they ignored court ${courtId}`);
                }

                try {
                    await SendDeepLink(item.followerId, title2, body2, deeplink);
                } catch (e) {
                    console.log('Error notifying follower', e);
                }
            }
        } while (lastKey);
    }
};

async function getUserInfo(userId: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE!,
        Key: {
            userId,
        }
    }

    const result = await dynamo.get(params).promise();

    if (!result.Item) {
        throw new Error('User does not exist');
    }

    return result.Item;
}

async function getUserInfoFromUsername(username_lcase: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE!,
        IndexName: 'username_lcase-index',
        KeyConditionExpression: 'username_lcase = :u',
        ExpressionAttributeValues: {
            ':u': username_lcase,
        }
    }

    const result = await dynamo.query(params).promise();

    if (!result.Items || result.Items.length < 1) {
        console.log(username_lcase + ' does not exist');
        return undefined;
    }

    return result.Items[0];
}