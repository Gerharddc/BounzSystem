/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';

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

    if (!event.ownerId) {
        throw new Error('Event lacks ownerId');
    }
    const ownerId = event.ownerId;

    const court = await getCourtInfo(courtId);
    if (court.ownerId !== ownerId) {
        throw new Error('Incorrect ownerId');
    }

    // We will get an error when deleting if the request never existed
    await deleteMembershipRequest(courtId, memberId);
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

async function deleteMembershipRequest(courtId: string, memberId: string) {
    // The ConditionExpression ensures that an error is thrown if the
    // record does not exist

    const params = {
        TableName: process.env.COURT_MEMBERSHIP_REQUESTS_TABLE,
        Key: {
            courtId,
            memberId,
        },
        ConditionExpression: 'courtId = :c AND memberId = :m',
        ExpressionAttributeValues: {
            ':c': courtId,
            ':m': memberId,
        },
    }

    return await dynamo.delete(params).promise();
}
