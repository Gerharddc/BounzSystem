/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as ejs from 'ejs';
import { Invite } from './shared/Models';

const ejsTemplate = require("./ejs/RenderInvite.ejs");

export async function handler(event: any, context: Context) {
    try {
        if (!event.queryStringParameters.inviteId) {
            throw new Error("Called without inviteId");
        }
        const inviteId = event.queryStringParameters.inviteId;

        const invite = await Invite.findByPk(inviteId, { include: ['event'] });
        const name = invite.inviteeName;
        const { attendanceLimit } = invite;
        const { description, location, title } = invite.event;
        const date = invite.event.date.toDateString();
        const rsvpDate = invite.event.rsvpDate.toDateString();

        const body = ejs.render(ejsTemplate, { 
            name,
            description,
            location,
            date,
            title,
            rsvpDate,
            inviteId,
            attendanceLimit
        });

        const response = {
            statusCode: 200,
            body,
            headers: {
                'Content-Type': 'text/html',
            }
        };

        return response;
    } catch (e) {
        const response = {
            statusCode: 500,
            body: JSON.stringify({ error: e.message })
        };

        return response;
    }
}

