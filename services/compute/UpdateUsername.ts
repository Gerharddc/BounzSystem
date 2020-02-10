/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as twitter from 'twitter-text';

const dynamo = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });

let USER_POOL_ID;

export async function handler(event: any, context: Context) {
    if (!event.userId) {
        throw new Error('Event lacks userId');
    }
    const userId = event.userId;

    if (!event.username) {
        throw new Error('Event lacks username');
    }
    const username = event.username;

    if (!twitter.isValidUsername('@' + username)) {
        throw new Error('Invalid username format');
    }

    const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
    USER_POOL_ID = resp.Parameter.Value;

    await updateCognito(userId, username); // This should throw an error if the username is taken
    return await updateDynamo(userId, username);
}

async function updateDynamo(userId: string, username: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
        Key: { userId },
        UpdateExpression: 'SET username = :u, username_lcase = :l',
        ConditionExpression: 'attribute_exists(username)',
        ExpressionAttributeValues: {
            ':u': username,
            ':l': username.toLowerCase(),
        },
        ReturnValues: 'ALL_NEW',
    }

    return (await dynamo.update(params).promise()).Attributes;
}

async function updateCognito(userId: string, username: string) {
    const params = {
        UserAttributes: [
            {
                Name: 'preferred_username',
                Value: username.toLowerCase(),
            },
        ],
        UserPoolId: USER_POOL_ID,
        Username: userId,
    }

    const result = await cognito.adminUpdateUserAttributes(params).promise();
    console.log('result', result);
}