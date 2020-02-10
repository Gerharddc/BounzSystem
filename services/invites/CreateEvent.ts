/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import { Event } from "./shared/Models";

export async function handler(event: any, context: Context) {
    if (!event.title) {
        throw new Error("Event lacks eventTitle");
    }
    const title = event.title;

    if (!event.type) {
        throw new Error("Event lacks eventType");
    }
    const type = event.type;

    if (!event.description) {
        throw new Error("Event lacks description");
    }
    const description = event.description;

    if (!event.location) {
        throw new Error("Event lacks location");
    }
    const location = event.location;

    if (!event.ownerId) {
        throw new Error("Event lacks ownerId");
    }
    const ownerId = event.ownerId;

    if (!event.date) {
        throw new Error("Event lacks date");
    }
    const date = new Date(event.date);

    if (!event.rsvpDate) {
        throw new Error("Event lacks rsvpDate");
    }
    const rsvpDate = new Date(event.rsvpDate);

    // TODO: add check to ensure that caller is the owner of the event

    await Event.sync();
    const e = await Event.create({
        title,
        type,
        description,
        location,
        ownerId,
        date,
        rsvpDate,
    });

    return e;
}

