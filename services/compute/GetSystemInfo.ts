/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const ssm = new AWS.SSM();

export async function handler(event: any, context: Context) {
    try {
        const SystemStatus = (await ssm.getParameter({ Name: 'SystemStatus-' + process.env.STAGE }).promise()).Parameter.Value;
        const MinApi = (await ssm.getParameter({ Name: 'MinApi-' + process.env.STAGE }).promise()).Parameter.Value;

        const response = {
            statusCode: 200,
            body: JSON.stringify({ SystemStatus, MinApi })
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

