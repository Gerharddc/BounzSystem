/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { checkBlocked } from "./shared/CheckBlocked";
import { extractThreadDetails } from './shared/ExtractThreadDetails';
import { tagifyMentions } from "./shared/TagifyMentions";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    const messageDate = new Date().toISOString();

    if (!event.messengerId) {
        throw new Error("Event lacks messengerId");
    }
    const messengerId = event.messengerId;

    if (!event.message) {
        throw new Error("Event lacks message");
    }
    const message = event.message.trim();

    if (message.length > 500) {
        throw new Error("Message is too long");
    }

    if (!event.threadId) {
        throw new Error("Event lacks threadId");
    }
    const threadId = event.threadId;
    const thread = extractThreadDetails(threadId);

    console.log('thread', thread);
    console.log('message', message);

    if (thread.type === 'users') {
        if (thread.userIdA > thread.userIdB) {
            throw new Error('Invalid user id order');
        }

        if (thread.userIdA !== messengerId && thread.userIdB !== messengerId) {
            throw new Error('Messenger not one of the users');
        }

        if (await checkBlocked(thread.userIdA, thread.userIdB)) {
            throw new Error("UserA has blocked UserB");
        }

        if (await checkBlocked(thread.userIdB, thread.userIdA)) {
            throw new Error("UserB has blocked UserA");
        }

        // TODO: ensure users exist
    } else {
        // TODO: maybe check if thread owner has blocked user

        // TODO: check if messenger is a member of the court
    }

    const tagifiedMessage = await tagifyMentions(message);
    await createRecord(threadId, messengerId, messageDate, tagifiedMessage);

    console.log("Completed");
    return {
        threadId,
        messengerId,
        messageDate,
        message : tagifiedMessage,
    };
}

async function createRecord(
    threadId: string,
    messengerId: string,
    messageDate: string,
    message: string
) {
    const params = {
        TableName: process.env.MESSAGES_TABLE,
        Item: {
            threadId,
            messengerId,
            messageDate,
            message
        }
    };

    return await dynamo.put(params).promise();
}
/*
function extractThreadDetails(threadId: string) {
    console.log('Extracting thread details', threadId);
    const dict = new Map();

    const keyVals = threadId.split(';');
    console.log('keyVals', keyVals);

    for (const keyVal of threadId.split(';')) {
        const segs = keyVal.split(':');
        if (segs.length !== 2) {
            console.log('Invalid threadId key-value pair', keyVal);
            throw new Error('Invalid threadId key-value pair');
        }

        dict.set(segs[0], segs[1]);
    }

    if (dict.has('userIdA') && dict.has('userIdB')) {
        return {
            type: 'users',
            userIdA: dict.get('userIdA'),
            userIdB: dict.get('userIdB'),
        };
    } else if (dict.has('courtId')) {
        return {
            type: 'court',
            courtId: dict.get('courtId'),
        };
    } else {
        throw new Error('Unregocnised threadId type');
    }
} */
