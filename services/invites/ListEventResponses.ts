/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Invite, InviteResponse } from './shared/Models';
import { Op } from 'sequelize';

export async function handler(event: any, context: Context) {
    if (!event.eventId) {
        throw new Error("Called without eventId");
    }

    const startToken = event.nextToken;
    const limit = event.limit || 20;
    const eventId = event.eventId;

    console.log('eventId', eventId);
    console.log('startToken', startToken);

    const params = {
        where: {
            eventId,
            inviteId: {
                [Op.gte]: startToken
            },
        },
        include: ['inviteResponse'],
        order: [
            [{ model: InviteResponse, as: 'inviteResponse' }, 'responseType'],
            ['inviteId'],
        ],
        limit: limit + 1,
    }

    if (!startToken) {
        delete params.where.inviteId;
    }

    const result = await Invite.findAll(params);

    const items = result.map((item) => {
        let response;

        if (item.dataValues.inviteResponse) {
            response = {
                responseId: item.dataValues.inviteResponse.responseId,
                inviteId: item.dataValues.inviteResponse.inviteId,
                responseType: item.dataValues.inviteResponse.responseType,
                attendanceCount: item.dataValues.inviteResponse.attendanceCount,
                comment: item.dataValues.inviteResponse.comment,
                __typename: 'InviteResponse',
            }
        }

        const invite = {
            inviteId: item.dataValues.inviteId,
            eventId: eventId,
            inviteeId: item.dataValues.inviteeId,
            inviteeName: item.dataValues.inviteeName,
            inviteeSurname: item.dataValues.inviteeSurname,
            attendanceLimit: item.dataValues.attendanceLimit,
            __typename: 'Invite',
        }

        return {
            response,
            invite,
            __typename: 'RespondedInvite',
        }
    });

    let nextToken;
    if (items.length > limit) {
        nextToken = items[limit].invite.inviteId;
    }

    const responseList = {
        items: items.slice(0, limit),
        nextToken,
    };

    return responseList;
}

