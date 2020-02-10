/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';
import { getFollowers } from './shared/DistributePosts';

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

        const ownerId = record.dynamodb.NewImage.ownerId.S;
        const courtId = record.dynamodb.NewImage.courtId.S;
        const name = record.dynamodb.NewImage.name.S;

        const owner = await getUserInfo(ownerId)

        const title = 'New court';
        const body = `${owner.username} has created ${name}`;
        const deeplink = `bounz://court/${courtId}`;

        let lastKey: any;
        do {
            const { Items, LastEvaluatedKey } = await getFollowers(ownerId, lastKey);
            lastKey = LastEvaluatedKey;

            for (const item of Items) {
                if (!item.followerId) {
                    throw new Error('Item lacks followerId');
                }

                try {
                    await SendDeepLink(item.followerId, title, body, deeplink);
                } catch (e) {
                    console.log('Error notifying follower', e);
                }
            }
        } while (lastKey);
    }
};

async function getUserInfo(userId: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
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

