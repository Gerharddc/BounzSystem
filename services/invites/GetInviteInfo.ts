/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Invite } from './shared/Models';

export async function handler(event: any, context: Context) {
    if (!event.inviteId) {
        throw new Error("Called without inviteId");
    }

    const inviteId = event.inviteId;
    console.log('InviteId: ', inviteId);

    const invite = await Invite.findByPk(inviteId, { include: ['event'] });
    console.log('Invite: ', invite);
    console.log('Event: ', invite.event);

    const info = {
        event: {
            eventId: invite.event.eventId,
            title: invite.event.title,
            type: invite.event.type,
            description: invite.event.description,
            location: invite.event.location,
            ownerId: invite.event.ownerId,
            date: invite.event.date.toISOString(),
            rsvpDate: invite.event.rsvpDate.toISOString(),
        },
        invite: {
            eventId: invite.event.eventId,
            inviteId: invite.inviteId,
            inviteeId: invite.inviteeId,
            inviteeName: invite.inviteeName,
            inviteeSurname: invite.inviteeSurname,
            attendanceLimit: invite.attendanceLimit,
        },
    }
    
    return info;
}

