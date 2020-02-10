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
        let courtId: string;
        let count: number;

        switch (record.eventName) {
            case 'INSERT':
                courtId = record.dynamodb.NewImage.courtId.S;
                count = counts.get(courtId);
                counts.set(courtId, count ? count + 1 : 1);
                break;
            case 'REMOVE':
                courtId = record.dynamodb.OldImage.courtId.S;
                count = counts.get(courtId);
                counts.set(courtId, count ? count - 1 : -1);
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

async function updateCount(courtId: string, count: number) {
    const input = {
        courtId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementCourtMembers, 'IncrementCourtMembers', { input });
    console.log('result', result);
    return result;
}