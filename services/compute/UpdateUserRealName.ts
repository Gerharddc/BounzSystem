/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as elasticsearch from "elasticsearch";

const dynamo = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });

let USER_POOL_ID;

const es = new elasticsearch.Client({
    hosts: [
        process.env.ELASTICSEARCH_URL
    ],
    connectionClass: require("http-aws-es"),
    apiVersion: "6.3"
});

const TABLE = "userinfo";

export async function handler(event: any, context: Context) {
    if (!event.userId) {
        throw new Error('Event lacks userId');
    }
    const userId = event.userId;

    if (!event.name) {
        throw new Error('Event lacks name');
    }
    const name = event.name;

    if (!event.family_name) {
        throw new Error('Event lacks family_name');
    }
    const family_name = event.family_name;

    if (!USER_POOL_ID) {
        const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
        USER_POOL_ID = resp.Parameter.Value;
    }

    const user = await getUserInfo(userId);

    await updateCognito(userId, name, family_name);
    await updateES(userId, name, family_name, user.username, user.profilePicRev);

    return name + " " + family_name;
}

async function updateCognito(userId: string, name: string, family_name: string) {
    const params = {
        UserAttributes: [
            {
                Name: 'name',
                Value: name,
            },
            {
                Name: 'family_name',
                Value: family_name,
            },
        ],
        UserPoolId: USER_POOL_ID,
        Username: userId,
    }

    const result = await cognito.adminUpdateUserAttributes(params).promise();
    console.log('result', result);
}

async function updateES(userId: string, name: string, family_name: string, username: string, profilePicRev: number) {
    const realName = name + ' ' + family_name;
    
    const body = {
        suggest: {
            input: [username, realName],
            weight: 1
        },
        username: username,
        name: realName,
        profilePicRev: profilePicRev
    };

    await es.index({
        index: TABLE,
        body,
        id: userId,
        type: TABLE,
        refresh: "true"
    });

    console.log("Success - Updated Index ID", userId);
}

async function getUserInfo(userId: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
        Key: {
            userId,
        }
    }

    const result = await dynamo.get(params).promise();

    if (!result.Item) {
        //throw new Error('User does not exist');
        console.log('User does not exist');
    }

    return result.Item;
}