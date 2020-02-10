/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import { Invite, Event } from "./shared/Models";

export async function handler(event: any, context: Context) {
    if (!event.eventId) {
        throw new Error("Event lacks eventId");
    }
    const eventId = event.eventId;

    const eventRecord = await Event.findByPk(eventId);

    if (!(event.callerId === eventRecord.ownerId)){
        throw new Error("Caller not owner");
    }

    if (!event.inviteeName) {
        throw new Error("Event lacks inviteeName");
    }
    const inviteeName = event.inviteeName;

    if (!event.inviteeSurname) {
        throw new Error("Event lacks inviteeSurname");
    }
    const inviteeSurname = event.inviteeSurname;

    if (!event.attendanceLimit) {
        throw new Error("Event lacks attendanceLimit");
    }
    const attendanceLimit = event.attendanceLimit;

    const inviteeId = event.inviteeId;

    // TODO: add check to ensure that caller is the owner of the event

    await Invite.sync();
    const invite = await Invite.create({
        eventId,
        inviteeId,
        inviteeName,
        inviteeSurname,
        attendanceLimit,
    });

    return invite;
}

