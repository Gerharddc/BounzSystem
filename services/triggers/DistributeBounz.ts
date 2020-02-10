/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { spreadToFollowers, distributeBounty } from './shared/DistributePosts';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    // TODO: deal with incomplete transaction

    for (const record of event.Records) {
        if (record.eventName !== 'INSERT') {
            console.log('Non-insert event ignored', record);
            continue;
        }

        console.log('record', record);

        const bounzerId = record.dynamodb.NewImage.bounzerId.S;
        const postId = record.dynamodb.NewImage.postId.S;
        const bounzedDate = record.dynamodb.NewImage.bounzedDate.S;

        const parts = postId.split(';');
        const creatorId = parts[0];
        const postedDate = parts[1];

        const sentPost = await getSentPost(creatorId, postedDate);
        if (!sentPost) {
            console.log('SentPost does not exists', postId);
            return;
        }

        const newReceipts = await spreadToFollowers(creatorId, postedDate, sentPost.courtId, bounzerId, bounzedDate);
        console.log('newReceipts', newReceipts);

        if (sentPost.bounty) {
            const bounty = Math.min(sentPost.bounty, newReceipts);
            console.log('Distrobuting ' + bounty + ' bounty');
            await distributeBounty(creatorId, postedDate, bounzerId, bounty);
        }
    }
};

async function getSentPost(creatorId: string, postedDate: string) {
    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        Key: {
            creatorId,
            postedDate
        }
    };

    return (await dynamo.get(params).promise()).Item;
}
