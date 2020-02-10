/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { checkBlocked } from './shared/CheckBlocked';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.courtId) {
        throw new Error('Event lacks courtId');
    }
    const courtId = event.courtId;

    if (!event.memberId) {
        throw new Error('Event lacks memberId');
    }
    const memberId = event.memberId;

    const courtInfo = await getCourtInfo(courtId);

    if (!courtInfo.restricted) {
        throw new Error('Court not restricted');
    }

    const blocked = await checkBlocked(courtInfo.ownerId, memberId);
    console.log("blocked", blocked);
    if (blocked) {
        throw new Error("Court owner has blocked this user");
    }

    return await createMembershipRequest(courtId, memberId, courtInfo.ownerId);
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

async function createMembershipRequest(courtId: string, memberId: string, ownerId: string) {
    const Item = {
        courtId,
        memberId,
        ownerId,
    }

    const params = {
        TableName: process.env.COURT_MEMBERSHIP_REQUESTS_TABLE,
        Item,
    }

    await dynamo.put(params).promise();
    return Item;
}