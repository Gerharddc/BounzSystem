/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import RunAppSyncQuery from './shared/RunAppSyncQuery';
import * as mutations from './shared/graphql/mutations';

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    const counts = new Map<string, number>();

    for (const record of event.Records) {
        if (record.eventName === 'MODIFY') {
            console.log('Modify event ignored', record);
            continue;
        }

        console.log('record', record);
        let memberId: string;
        let count: number;

        switch (record.eventName) {
            case 'INSERT':
                memberId = record.dynamodb.NewImage.memberId.S;
                count = counts.get(memberId);
                counts.set(memberId, count ? count + 1 : 1);
                break;
            case 'REMOVE':
                memberId = record.dynamodb.OldImage.memberId.S;
                count = counts.get(memberId);
                counts.set(memberId, count ? count - 1 : -1);
                break;
            default:
                console.log('Unkown event type', record);
                break;
        }
    }

    console.log('counts', counts);

    for (const item of counts) {
        const id = item[0];
        const count = item[1];

        try {
            await updateCount(id, count);
            console.log('Updated count');
        } catch (e) {
            console.log('Error updating count', e);
        }
    }

    console.log('done');
};

async function updateCount(userId: string, count: number) {
    const input = {
        count,
        userId,
    };

    const result = await RunAppSyncQuery(mutations.incrementCourtsJoined, 'IncrementCourtsJoined', { input });
    console.log('result', result);
    return result;
}