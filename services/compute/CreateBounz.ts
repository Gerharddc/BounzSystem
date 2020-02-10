/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { checkBlocked } from "./shared/CheckBlocked";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    const bounzedDate = new Date().toISOString();

    if (!event.bounzerId) {
        throw new Error("Event lacks bounzerId");
    }
    const bounzerId = event.bounzerId;

    if (!event.postId) {
        throw new Error("Event lacks postId");
    }
    const postId = event.postId;

    const parts = postId.split(";");
    const creatorId = parts[0];
    const postedDate = parts[1];

    console.log("Bounzing " + postId + " for " + bounzerId);

    if (creatorId === 'ghost') {
        throw new Error('Cannot bounz posts from ghost');
    }

    const sentPost = await getSentPost(creatorId, postedDate);
    if (!sentPost) {
        throw new Error("Post does not exist");
    }

    if (creatorId === bounzerId) {
        throw new Error("Cannot bounz own post");
    }

    console.log("SentPost exists");

    const blocked = await checkBlocked(creatorId, bounzerId);
    console.log("blocked", blocked);
    if (blocked) {
        throw new Error("Post creator has blocked this user");
    }

    await createBounzRecord(bounzerId, postId, bounzedDate);

    console.log("Completed");
    return {
        bounzerId,
        postId,
        bounzedDate
    };
}

async function getSentPost(creatorId: string, postedDate: string) {
    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        Key: {
            creatorId,
            postedDate
        }
    };

    return (await dynamo.get(params).promise()).Item;
}

async function createBounzRecord(bounzerId: string, postId: string, bounzedDate: string) {
    const params = {
        TableName: process.env.BOUNZES_TABLE,
        Item: {
            bounzerId,
            postId,
            bounzedDate
        }
    };

    return await dynamo.put(params).promise();
}
