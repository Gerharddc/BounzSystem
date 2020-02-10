/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.threadId) {
        throw new Error('Event lacks threadId');
    }

    if (!event.messageDate) {
        throw new Error('Event lacks messageDate');
    }

    return await updateDynamo(event.threadId, event.messageDate);
}

async function updateDynamo(threadId: string, messageDate: string) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        Key: { threadId, messageDate },
        UpdateExpression: 'SET opened = :u',
        ConditionExpression: 'attribute_exists(threadId) AND attribute_exists(messageDate)',
        ExpressionAttributeValues: {
            ':u': true,
        },
        ReturnValues: 'ALL_NEW',
    }

    return (await dynamo.update(params).promise()).Attributes;
}