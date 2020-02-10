/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import { spreadToFollowers } from './shared/DistributePosts';

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    // TODO: deal with incomplete transaction

    for (const record of event.Records) {
        if (record.eventName !== 'INSERT') {
            console.log('Non-insert event ignored', record);
            continue;
        }

        console.log('record', record);

        const creatorId = record.dynamodb.NewImage.creatorId.S;
        const postedDate = record.dynamodb.NewImage.postedDate.S;
        const courtId = record.dynamodb.NewImage.courtId ? record.dynamodb.NewImage.courtId.S : undefined;

        const newReceipts = await spreadToFollowers(creatorId, postedDate, courtId);
        console.log('newReceipts', newReceipts);
    }
};
