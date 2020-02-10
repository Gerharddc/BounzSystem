/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as redis from 'redis';
import { promisify } from 'util';
import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

const client = redis.createClient({ host: process.env.LEADERBOARD_REDIS_HOST });
const zincrby = promisify(client.zincrby).bind(client);

interface IAmazonString {
    S: string;
}

interface IRecord {
    dynamodb: {
        NewImage?: {
            bounzerId: IAmazonString;
            postId: IAmazonString;
            bounzedDate: IAmazonString;
        };
        OldImage?: {
            bounzerId: IAmazonString;
            postId: IAmazonString;
            bounzedDate: IAmazonString;
        };
    };
    eventName: string;
}

const competitions = [
    {
        id: 'rescomp',
        participatingCourts: [
            '48bd2206-ea22-47c2-82be-e1172aeb2a35',
            '53393983-e5ef-4852-8f44-af7e0c03d176',
            'ad612336-1c9f-42da-b6e9-9a87d2314e51'
        ]
    },
];

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        throw new Error("Event lacks Records");
    }
    console.log("Event records", event.Records.length);

    const postCounts = new Map<string, number>();
    const courtCounts = new Map<string, number>();

    for (const record of event.Records as IRecord[]) {
        if (record.eventName === "MODIFY") {
            continue;
        }

        const { postId } = (record.dynamodb.NewImage || record.dynamodb.OldImage)!;

        const postCount = postCounts.get(postId.S);

        if (record.eventName === "INSERT") {
            postCounts.set(postId.S, postCount ? postCount + 1 : 1);
        } else {
            postCounts.set(postId.S, postCount ? postCount - 1 : -1);
        }
    }

    console.log("postCount", postCounts);

    // TODO: roll back if errors

    for (const item of postCounts) {
        const id = item[0];
        const count = item[1];

        const split = id.split(";");
        const creatorId = split[0];
        const postedDate = split[1];

        if (!creatorId) {
            console.log("No creatorId");
            continue;
        }

        if (!postedDate) {
            console.log("No postedDate");
            continue;
        }

        const sentPost = await getSentPost(creatorId, postedDate);

        if (!sentPost) {
            console.log('WTF post does not exist', { creatorId, postedDate });
            continue;
        }

        if (!sentPost.courtId) {
            continue;
        }

        const courtCount = courtCounts.get(sentPost.courtId);
        courtCounts.set(sentPost.courtId, courtCount ? courtCount + count : count);
    }

    console.log("courtCounts", courtCounts);

    for (const item of courtCounts) {
        const id = item[0];
        const count = item[1];

        for (const comp of competitions) {
            if (comp.participatingCourts.includes(id)) {
                await incrementScore(comp.id, id, count);
                console.log(`Added ${count} to ${comp.id} for ${id}`);
            }
        }
    }

    console.log("Completed");
};

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

async function incrementScore(leaderboard: string, courtId: string, count: number) {
    return await zincrby(leaderboard, count, courtId);
}