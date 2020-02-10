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
        let ownerId: string;
        let count: number;

        switch (record.eventName) {
            case 'INSERT':
                ownerId = record.dynamodb.NewImage.ownerId.S;
                count = counts.get(ownerId);
                counts.set(ownerId, count ? count + 1 : 1);
                break;
            case 'REMOVE':
                ownerId = record.dynamodb.OldImage.ownerId.S;
                count = counts.get(ownerId);
                counts.set(ownerId, count ? count - 1 : -1);
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

    const result = await RunAppSyncQuery(mutations.incrementCourtsOwned, 'IncrementCourtsOwned', { input });
    console.log('result', result);
    return result;
}