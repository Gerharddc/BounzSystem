/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import { SendDeepLink } from './shared/Notification';

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    for (const record of event.Records) {
        if (record.eventName !== 'UPDATE') {
            console.log('Non-insert event ignored', record);
            continue;
        }

        console.log('record', record);

        const userId = record.dynamodb.NewImage.userId.S;

        if (!record.dynamodb.NewImage.bounty) {
            console.log('Skipping user with no bounty');
        }

        const newBounty = record.dynamodb.NewImage.bounty.S;
        const oldBounty = record.dynamodb.OldImage.bounty ? record.dynamodb.OldImage.bounty.S : 0;

        const deltaBounty = newBounty - oldBounty;

        if (deltaBounty === 0) {
            console.log('Skipping no bounty change');
            continue;
        } else if (deltaBounty < 0) {
            console.log('Skipping negative bounty change');
            continue;
        }

        const title = `You received bounty`;
        const body = deltaBounty.toString() + ' bounty awarded!';
        const deeplink = `bounz://bounty`;

        await SendDeepLink(userId, title, body, deeplink);
    }
};
