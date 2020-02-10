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

    const userCounts = new Map<string, number>();
    const courtCounts = new Map<string, number>();

    for (const record of event.Records) {
        if (record.eventName === 'MODIFY') {
            console.log('Modify event ignored', record);
            continue;
        }

        console.log('record', record);
        let userId: string, courtId: string;
        let userCount: number, courtCount: number;

        switch (record.eventName) {
            case 'INSERT':
                userId = record.dynamodb.NewImage.creatorId.S;
                userCount = userCounts.get(userId);
                userCounts.set(userId, userCount ? userCount + 1 : 1);

                if (record.dynamodb.NewImage.courtId) {
                    courtId = record.dynamodb.NewImage.courtId.S;
                    courtCount = courtCounts.get(courtId);
                    courtCounts.set(courtId, courtCount ? courtCount + 1 : 1);
                }
                break;
            case 'REMOVE':
                userId = record.dynamodb.OldImage.creatorId.S;
                userCount = userCounts.get(userId);
                userCounts.set(userId, userCount ? userCount - 1 : -1);

                if (record.dynamodb.OldImage.courtId) {
                    courtId = record.dynamodb.OldImage.courtId.S;
                    courtCount = courtCounts.get(courtId);
                    courtCounts.set(courtId, courtCount ? courtCount - 1 : -1);
                }
                break;
            default:
                console.log('Unkown event type', record);
                break;
        }
    }

    console.log('userCounts', userCounts);
    for (const item of userCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await updateUserPostCount(id, count);
            console.log('Updated UserPostCount');
        } catch (e) {
            console.log('Error updating UserPostCount', e);
        }
    }

    console.log('courtCounts', courtCounts);
    for (const item of courtCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await updateCourtPostCount(id, count);
            console.log('Updated CourtPostCount');
        } catch (e) {
            console.log('Error updating CourtPostCount', e);
        }
    }

    console.log('done');
};

async function updateUserPostCount(userId: string, count: number) {
    const input = {
        userId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementUserPostCount, 'IncrementUserPostCount', { input });
    console.log('result', result);
    return result;
}

async function updateCourtPostCount(courtId: string, count: number) {
    const input = {
        courtId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementCourtPostCount, 'IncrementCourtPostCount', { input });
    console.log('result', result);
    return result;
}