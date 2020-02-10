/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Invite } from "./shared/Models";

export async function handler(event: any, context: Context) {
    if (!event.inviteId) {
        throw new Error("Event lacks inviteId");
    }
    const inviteId = event.inviteId;

    const inviteRecord = await Invite.findByPk(inviteId,  { include: ['event'] });
    console.log('inviteRecord', inviteRecord);
    const eventRecord = inviteRecord.dataValues.event;
    console.log('eventRecord', eventRecord);

    if (!(event.callerId === eventRecord.ownerId)){
        throw new Error("Caller not event owner");
    }

    const invite = {
        inviteId: inviteRecord.dataValues.inviteId,
        eventId: inviteRecord.dataValues.event.eventId,
        inviteeId: inviteRecord.dataValues.inviteeId,
        inviteeName: inviteRecord.dataValues.inviteeName,
        inviteeSurname: inviteRecord.dataValues.inviteeSurname,
        attendanceLimit: inviteRecord.dataValues.attendanceLimit,
    };

    await Invite.destroy({
        where: {
            inviteId: inviteId,
        }
    })

    return invite;
}

