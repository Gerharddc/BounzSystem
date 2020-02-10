/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';
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

        console.log('record', record);

        const commentorId = record.dynamodb.NewImage.commentorId.S;
        const comment = record.dynamodb.NewImage.comment.S;
        const postId = record.dynamodb.NewImage.postId.S;

        const creatorId = postId.split(';')[0];
        const commentor = await getUserInfo(commentorId);

        const mentions = extractMentions(comment);
        const receiverIds = mentions.users;
        console.log('receiverIds', receiverIds);

        const title = `${commentor.username} mentioned you in a comment`;
        const body = mentions.newText;
        const deeplink = `bounz://post/${postId}`;

        for (const receiverId of receiverIds) {
            await SendDeepLink(receiverId, title, body, deeplink);
            console.log('Notified', receiverId);
        }

        if (creatorId === commentorId) {
            continue;
        }

        const title2 = `${commentor.username} commented on your post`;
        const body2 = mentions.newText;

        await SendDeepLink(creatorId, title2, body2, deeplink);
        console.log('Notified', creatorId);
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