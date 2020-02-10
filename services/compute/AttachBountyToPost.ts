/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { incrementUserBounty, incrementSentPostBounty } from "./shared/DistributePosts";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.creatorId) {
        throw new Error("Event lacks creatorId");
    }
    const creatorId = event.creatorId;

    if (!event.postedDate) {
        throw new Error("Event lacks postedDate");
    }
    const postedDate = event.postedDate;

    if (!event.bounty) {
        throw new Error("Event lacks bounty");
    }
    const bounty = event.bounty;

    console.log('Attaching ' + bounty + ' to ' + creatorId + ';' + postedDate);

    // TODO: check minimum bounty amount

    const user = await getUserInfo(creatorId);
    if (!user) {
        throw new Error("User doe not exist");
    }

    if (!user.bounty || user.bounty < bounty) {
        throw new Error('User does not have enough bounty');
    }

    const p1 = incrementUserBounty(creatorId, -1 * bounty);
    const p2 = incrementSentPostBounty(creatorId, postedDate, bounty);

    const results = await Promise.all([p1, p2]);
    return results[1];
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
