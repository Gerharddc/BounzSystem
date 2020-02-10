/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as ejs from 'ejs';
import { InviteResponse } from './shared/Models';
import * as querystring from 'querystring';

const acceptedTemplate = require("./ejs/InviteAccepted.ejs");
const declinedTemplate = require("./ejs/InviteDeclined.ejs");

export async function handler(event: any, context: Context) {
    try {
        const params = querystring.parse(event.body);
        console.log('params', params);

        if (!params.inviteId) {
            throw new Error('inviteId parameter missing');
        }
        const inviteId = params.inviteId;

        if (!params.response) {
            throw new Error('response parameter missing');
        }

        if (!params.attending) {
            throw new Error('attending parameter missing');
        }
        const attendanceCount = params.attending;

        if (params.comments && params.comments.length > 250) {
            throw new Error('comments too long');
        }
        const comment = params.comments;

        // TODO: check valid attending count

        const name = params.name;

        const runDb = async () => {
            await InviteResponse.sync();
            await InviteResponse.create({
                responseId: inviteId,
                inviteId,
                responseType: params.response,
                attendanceCount,
                comment,
            });
        }

        const dbWait = runDb();

        // Process rendering while we wait for the db

        let body;
        if (params.response === 'Will attend') {
            body = ejs.render(acceptedTemplate, { name });
        } else {
            body = ejs.render(declinedTemplate, { name });
        }

        await dbWait;

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