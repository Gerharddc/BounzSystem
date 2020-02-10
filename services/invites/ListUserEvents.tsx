/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Herman Lombard
 */

import { Context } from "aws-lambda";
import { Event } from './shared/Models';
import { Op } from 'sequelize';

export async function handler(event: any, context: Context) {
    if (!event.ownerId) {
        throw new Error("Called without ownerId");
    }

    const ownerId = event.ownerId;
    const limit = event.limit || 20;
    const startToken = event.nextToken;

    console.log('ownerId: ', ownerId);
    console.log('startToken', startToken);

    const params = {
        where: {
            ownerId: ownerId,
            eventId: {
                [Op.gte]: startToken
            },
        },
        order: [['eventId']],
        limit: limit + 1,
    };

    if (!startToken) {
        delete params.where.eventId;
    }

    const result = await Event.findAll(params);

    const items = result.map((item) => ({
        eventId: item.dataValues.eventId,
        title: item.dataValues.title,
        type: item.dataValues.type,
        description: item.dataValues.description,
        location: item.dataValues.location,
        ownerId: item.dataValues.ownerId,
        date: item.dataValues.date.toISOString(),
        rsvpDate: item.dataValues.rsvpDate.toISOString(),
    }));

    let nextToken;
    if (items.length > limit) {
        nextToken = items[limit].eventId;
    }

    const eventList = {
        items: items.slice(0, limit),
        nextToken,
    };

    return eventList;
}

