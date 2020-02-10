/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { checkBlocked } from "./shared/CheckBlocked";

const dynamo = new AWS.DynamoDB.DocumentClient();
const GHOST_ID = 'ghost';

export async function handler(event: any, context: Context) {
    if (!event.userId) {
        throw new Error("Event lacks userId");
    }
    const userId = event.userId;

    if (!event.requesterId) {
        throw new Error("Event lacks requesterId");
    }
    const requesterId = event.requesterId;

    let user;

    if (await checkBlocked(userId, requesterId)) {
        console.log('Blocked so sending ghost');
        user = await getUserInfo(GHOST_ID);
    } else {
        user = await getUserInfo(userId);
    }

    console.log('user', user);
    return user;
}

async function getUserInfo(userId: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
        Key: {
            userId,
        }
    };

    return (await dynamo.get(params).promise()).Item;
}
