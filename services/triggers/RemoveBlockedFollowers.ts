/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';

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

        const blockerId = record.dynamodb.NewImage.blockerId.S;
        const blockeeId = record.dynamodb.NewImage.blockeeId.S;

        await removeFollower(blockerId, blockeeId);
        await removeFollower(blockeeId, blockerId);
    }

    console.log('done');
};

async function removeFollower(followerId: string, followeeId: string) {
    var params = {
        TableName: process.env.FOLLOWERS_TABLE!,
        Key: {
            followerId,
            followeeId,
        }
    };

    await dynamo.delete(params).promise();
}