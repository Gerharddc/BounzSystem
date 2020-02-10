/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Event, Invite } from "./shared/Models";

export async function handler(event: any, context: Context) {
    if (!event.eventId) {
        throw new Error("Event lacks eventId");
    }
    const eventId = event.eventId;

    const eventRecord = await Event.findByPk(eventId);

    if (!(event.callerId === eventRecord.ownerId)){
        throw new Error("Caller not owner");
    }

    await Invite.destroy({
        where: {
            eventId: eventId,
        }
    })

    await Event.destroy({
        where: {
            eventId: eventId,
        }
    })

    return eventRecord;
}

