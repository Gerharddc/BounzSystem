/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    try {
        if (!event.queryStringParameters.username) {
            throw new Error("Called without username");
        }

        const username = event.queryStringParameters.username;

        const params = {
            TableName: process.env.USER_INFO_TABLE,
            IndexName: "username_lcase-index",
            KeyConditionExpression: "username_lcase = :i",
            ExpressionAttributeValues: {
                ":i": username.toLowerCase(),
            }
        };

        const data = await dynamo.query(params).promise();
        const exists = data.Items.length > 0;

        const response = {
            statusCode: 200,
            body: JSON.stringify({ exists })
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

