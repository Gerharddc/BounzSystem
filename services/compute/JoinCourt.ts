/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { checkBlocked } from './shared/CheckBlocked';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    console.log('event', event);

    if (!event.courtId) {
        throw new Error('Event lacks courtId');
    }
    const courtId = event.courtId;

    if (!event.memberId) {
        throw new Error('Event lacks memberId');
    }
    const memberId = event.memberId;

    const court = await getCourtInfo(courtId);
    const { restricted, ownerId } = court;
    if (restricted === true || restricted === 'true') {
        throw new Error('Restricted court');
    }

    const blocked = await checkBlocked(ownerId, memberId);
    console.log("blocked", blocked);
    if (blocked) {
        throw new Error("Court owner has blocked this user");
    }

    return await createMember(courtId, memberId);
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

async function createMember(courtId: string, memberId: string) {
    const Item = {
        courtId,
        memberId,
    }

    const params = {
        TableName: process.env.COURT_MEMBERS_TABLE,
        Item,
    }

    await dynamo.put(params).promise();
    return Item;
}