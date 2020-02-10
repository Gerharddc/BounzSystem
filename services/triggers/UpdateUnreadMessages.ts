/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { extractThreadDetails } from './shared/ExtractThreadDetails';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    const userCounts = new Map<string, number>();
    const threadCounts = new Map<string, number>();

    for (const record of event.Records) {

        console.log('record', record);
        let userId: string, threadId: string;
        let userCount: number, threadCount: number;
        let message: any, thread: any;

        switch (record.eventName) {
            case 'INSERT':
                message = record.dynamodb.NewImage;
                thread = extractThreadDetails(message.threadId.S);

                if (thread.type === 'court') {
                    continue;
                } else if (thread.userIdA === message.messengerId.S) {
                    userId = thread.userIdB;
                } else {
                    userId = thread.userIdA;
                }

                userCount = userCounts.get(userId);
                userCounts.set(userId, userCount ? userCount + 1 : 1);

                threadId = message.threadId.S;
                threadCount = threadCounts.get(threadId);
                threadCounts.set(threadId, threadCount ? threadCount + 1 : 1);
                break;
            case 'REMOVE':
                message = record.dynamodb.OldImage;
                console.log('Message: ', message);
                thread = extractThreadDetails(message.threadId.S);

                if (thread.type === 'court') {
                    continue;
                } else if (thread.userIdA === message.messengerId.S) {
                    userId = thread.userIdB;
                } else {
                    userId = thread.userIdA;
                }

                if (!message.opened.BOOL) {
                    userCount = userCounts.get(userId);
                    userCounts.set(userId, userCount ? userCount - 1 : -1);

                    threadId = record.dynamodb.OldImage.threadId.S;
                    threadCount = threadCounts.get(threadId);
                    threadCounts.set(threadId, threadCount ? threadCount - 1 : -1);
                }
                break;
            case 'MODIFY':
                message = record.dynamodb.NewImage;
                thread = extractThreadDetails(message.threadId.S);

                if (thread.type === 'court') {
                    continue;
                } else if (thread.userIdA === message.messengerId.S) {
                    userId = thread.userIdB;
                } else {
                    userId = thread.userIdA;
                }

                userCount = userCounts.get(userId);
                userCounts.set(userId, userCount ? userCount - 1 : -1);

                threadId = record.dynamodb.OldImage.threadId.S;
                threadCount = threadCounts.get(threadId);
                threadCounts.set(threadId, threadCount ? threadCount - 1 : -1);

                break;
            default:
                console.log('Unkown event type', record);
                break;
        }
    }

    console.log('userCounts', userCounts);
    for (const item of userCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await updateUserMessageCount(id, count);
            console.log('Updated UserPostCount');
        } catch (e) {
            console.log('Error updating UserPostCount', e);
        }
    }

    console.log('threadCounts', threadCounts);
    for (const item of threadCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await updateThreadMessageCount(id, count);
            console.log('Updated ThreadMessageCount');
        } catch (e) {
            console.log('Error updating ThreadMessageCount', e);
        }
    }

    console.log('done');
};

async function updateUserMessageCount(userId: string, count: number) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        Key: { userId },
        UpdateExpression: 'ADD unreadMessages :u',
        ConditionExpression: 'attribute_exists(userId)',
        ExpressionAttributeValues: {
            ':u': count,
        },
        ReturnValues: 'ALL_NEW',
    }

    return (await dynamo.update(params).promise()).Attributes;
}

async function updateThreadMessageCount(threadId: string, count: number) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        Key: { threadId },
        UpdateExpression: 'ADD unreadMessages :u',
        ConditionExpression: 'attribute_exists(threadId)',
        ExpressionAttributeValues: {
            ':u': count,
        },
        ReturnValues: 'ALL_NEW',
    }

    return (await dynamo.update(params).promise()).Attributes;
}