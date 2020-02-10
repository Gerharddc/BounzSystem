/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { deleteRecords, deleteS3Objects } from './shared/Delete';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    for (const record of event.Records) {
        if (record.eventName !== 'REMOVE') {
            console.log('Non-remove event ignored', record);
            continue;
        }

        console.log('record', record);

        const courtId = record.dynamodb.OldImage.courtId.S;

        const p1 = await deleteCourtMembers(courtId);
        const p2 = await deleteCourtPosts(courtId);
        const p3 = await deleteCourtImage(courtId);
        const p4 = await deleteCourtMembershipRequests(courtId);
        const p5 = await deleteCourtMessages(courtId);

        await Promise.all([p1, p2, p3, p4, p5]);
    }
};

async function getCourtMembers(courtId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.COURT_MEMBERS_TABLE,
        KeyConditionExpression: 'courtId = :i',
        ExpressionAttributeValues: {
            ':i': courtId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteCourtMembers(courtId: string) {
    console.log('Deleting all members of: ', courtId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getCourtMembers(courtId, lastKey);
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.COURT_MEMBERS_TABLE);
    } while (lastKey);
}

async function getCourtMembershipRequests(courtId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.COURT_MEMBERSHIP_REQUESTS_TABLE,
        KeyConditionExpression: 'courtId = :i',
        ProjectionExpression: 'courtId, memberId',
        ExpressionAttributeValues: {
            ':i': courtId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteCourtMembershipRequests(courtId: string) {
    console.log('Deleting all court membership requests of: ', courtId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getCourtMembershipRequests(courtId, lastKey);
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.COURT_MEMBERSHIP_REQUESTS_TABLE);
    } while (lastKey);
}

async function getCourtPosts(courtId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        IndexName: 'courtId-index',
        ProjectionExpression: 'creatorId, postedDate',
        KeyConditionExpression: 'courtId = :i',
        ExpressionAttributeValues: {
            ':i': courtId,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteCourtPosts(courtId: string) {
    console.log('Deleting all posts in: ', courtId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getCourtPosts(courtId, lastKey);
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.SENT_POSTS_TABLE);
    } while (lastKey);
}

async function deleteCourtImage(courtId: string) {
    return await deleteS3Objects(process.env.PUBLIC_IMAGES_BUCKET, `court-pics/${courtId}`);
}

async function getCourtMessages(courtId: string, ExclusiveStartKey?: any) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        ProjectionExpression: 'threadId, messageDate',
        KeyConditionExpression: 'threadId = :i',
        ExpressionAttributeValues: {
            ':i': `courtId:${courtId}`,
        },
        ExclusiveStartKey,
        Limit: 25,
    };

    const data = await dynamo.query(params).promise();
    return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteCourtMessages(courtId: string) {
    console.log('Deleting all messages of: ', courtId);

    let lastKey: any;
    do {
        const { items, LastEvaluatedKey } = await getCourtMessages(courtId, lastKey);
        lastKey = LastEvaluatedKey;

        await deleteRecords(items, process.env.MESSAGES_TABLE);
    } while (lastKey);
}