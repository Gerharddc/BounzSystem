/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import fetch from 'node-fetch';
import * as twitter from 'twitter-text';
// import * as validate from 'uuid-validate';

const s3 = new AWS.S3();
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

    /*if (!validate(userId, 4)) {
        throw new Error('Username is not a valid UUIDv4');
    }*/

    if (!twitter.isValidUsername('@' + username)) {
        throw new Error('Invalid username format');
    }

    const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
    USER_POOL_ID = resp.Parameter.Value;

    await updateCognito(userId, username); // This should throw an error if the username is taken
    await assignDefaultProfilePic(userId);
    return await createRecord(userId, username);
}

async function assignDefaultProfilePic(userId: string) {
    const result = await fetch('https://www.bounz.io/assets/profilepic.jpg');
    const image = await result.buffer();

    const params = {
        Body: image,
        Bucket: process.env.PUBLIC_IMAGES_BUCKET,
        Key: `profile-pics/${userId}-0.jpg`,
    };

    return await s3.putObject(params).promise();
}

async function createRecord(userId: string, username: string) {
    const Item = {
        userId,
        username,
        username_lcase: username.toLowerCase(),
        bio: 'Awesome Bounz user',
        bounzesMade: 0,
        bounzesReceived: 0,
        followersCount: 0,
        followingCount: 0,
        location: 'Somewhere',
        postCount: 0,
        profilePicRev: 0,
        receipts: 0,
        courtsJoined: 0,
        courtsOwned: 0,
    }

    const params = {
        TableName: process.env.USER_INFO_TABLE,
        Item,
    }

    await dynamo.put(params).promise();
    return Item;
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