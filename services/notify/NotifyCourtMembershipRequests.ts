/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';

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

        const courtId = record.dynamodb.NewImage.courtId.S;
        const memberId = record.dynamodb.NewImage.memberId.S;

        const court = await getCourtInfo(courtId);
        const member = await getUserInfo(memberId);

        const title = 'Court membership request';
        const body = `${member.username} wants to join ${court.name}`;
        const deeplink = `bounz://courtmembershiprequest/${courtId}/${memberId}`;

        const result = await SendDeepLink(court.ownerId, title, body, deeplink);

        console.log('result', result);
    }
};

async function getCourtInfo(courtId: string) {
    const params = {
        TableName: process.env.COURT_INFO_TABLE,
        Key: {
            courtId,
        }
    }

    const result = await dynamo.get(params).promise();

    if (!result.Item) {
        throw new Error('Court does not exist');
    }

    return result.Item;
}

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