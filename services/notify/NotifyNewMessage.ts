/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';
import * as twitter from 'twitter-text';
import { extractMentions } from './shared/ExtractMentions';
import { extractThreadDetails } from './shared/ExtractThreadDetails';

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

        console.log('record', record);

        const messengerId = record.dynamodb.NewImage.messengerId.S;
        const message = record.dynamodb.NewImage.message.S;
        const threadId = record.dynamodb.NewImage.threadId.S;
        const mentions = extractMentions(message);
        const receiverIds = mentions.users;
        const messenger = await getUserInfo(messengerId);

        const thread = extractThreadDetails(threadId);

        const title1 = `${messenger.username} mentioned you in a message`;
        const body1 = mentions.newText;
        const deeplink = `bounz://messages/${threadId}`;

        const title2 = `${messenger.username} sent you a message`;
        const body2 = message;

        let receiverId = messengerId;

        if (thread.type == 'users') {
            if ( messengerId == thread.userIdA ) {
                receiverId = thread.userIdB;
            } else {
                receiverId = thread.userIdA;
            }

            await SendDeepLink(receiverId, title2, body2, deeplink);
            console.log('Notified', receiverId);
            continue;
        }

        if (thread.type == 'court') {
            for (const receiverId of receiverIds) {
                console.log('mentioned', receiverId);
                if (receiverId !== messengerId) {
                    await SendDeepLink(receiverId, title1, body1, deeplink);
                    console.log('Notified', receiverId);
                } else {
                    console.log('User not found');
                }
            }
        }
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