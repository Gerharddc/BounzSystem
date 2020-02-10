/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const pinpoint = new AWS.Pinpoint();

export async function handler(event: any, context: Context) {
    try {
        const userId = event.requestContext.authorizer.claims['cognito:username'];
        console.log('userId', userId);

        const params = {
            ApplicationId: process.env.PINPOINT_APP_ID,
            UserId: userId,
        }

        const res = await pinpoint.deleteUserEndpoints(params).promise();
        console.log('res', res);

        const response = {
            statusCode: 200,
            body: JSON.stringify({ res }),
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
