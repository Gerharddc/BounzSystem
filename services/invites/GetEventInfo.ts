/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Event } from './shared/Models';

export async function handler(event: any, context: Context) {
    if (!event.eventId) {
        throw new Error("Called without eventId");
    }

    const eventId = event.eventId;
    console.log('EventId: ', eventId);

    const eventInfo = await Event.findByPk(eventId);
    console.log('Event: ', eventInfo);
    
    return eventInfo.dataValues;
}

