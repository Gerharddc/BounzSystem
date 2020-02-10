/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Invite } from './shared/Models';
import { Op } from 'sequelize';

export async function handler(event: any, context: Context) {
    console.log('Event: ', event);

    if (!event.inviteeId) {
        throw new Error("Called without inviteeId");
    }

    const inviteeId = event.inviteeId;
    const limit = event.limit || 20;
    const startToken = event.nextToken;

    console.log('inviteeId: ', inviteeId);
    console.log('startToken', startToken);

    const params = {
        where: {
            inviteeId: inviteeId,
            inviteId: {
                [Op.gte]: startToken
            },
        },
        include: ['event', 'inviteResponse'],
        order: [['inviteId']],
        limit: limit + 1,
    };

    if (!startToken) {
        delete params.where.inviteId;
    }

    const result = await Invite.findAll(params);

    console.log('Result: ', result);

    const items = result.map((item) => {
        let response;

        const event = {
            eventId: item.dataValues.eventId,
            title: item.dataValues.event.title,
            type: item.dataValues.event.type,
            description: item.dataValues.event.description,
            location: item.dataValues.event.location,
            ownerId: item.dataValues.event.ownerId,
            date: item.dataValues.event.date.toISOString(),
            rsvpDate: item.dataValues.event.rsvpDate.toISOString(),
            __typename: 'Event',
        }

        const invite = {
            eventId: item.dataValues.eventId,
            inviteId: item.dataValues.inviteId,
            inviteeId: item.dataValues.inviteeId,
            inviteeName: item.dataValues.inviteeName,
            inviteeSurname: item.dataValues.inviteeSurname,
            attendanceLimit: item.dataValues.attendanceLimit,
            __typename: 'Invite',
        }

        if (item.dataValues.inviteResponse) {
            response = {
                inviteId: item.dataValues.inviteResponse.inviteId,
                responseId: item.dataValues.inviteResponse.responseId,
                responseType: item.dataValues.inviteResponse.responseType,
                attendanceCount: item.dataValues.inviteResponse.attendanceCount,
                comment: item.dataValues.inviteResponse.comment,
                __typename: 'InviteResponse',
            } 
        } else {
            response = null;
        }

        return {
            response,
            event,
            invite,
            __typename: 'InvitedEvent',
        }
    });

    console.log('Items: ', items);

    let nextToken;
    if (items.length > limit) {
        nextToken = items[limit].inviteId;
    }

    const eventList = {
        items: items.slice(0, limit),
        nextToken,
        __typename: 'InvitedEventsList',
    };

    return eventList;
}

