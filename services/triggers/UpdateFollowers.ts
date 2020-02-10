/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import RunAppSyncQuery from "./shared/RunAppSyncQuery";
import * as mutations from './shared/graphql/mutations';

interface IAmazonString {
    S: string;
}

interface IRecord {
    dynamodb: {
        NewImage?: {
            followerId: IAmazonString;
            followeeId: IAmazonString;
        };
        OldImage?: {
            followerId: IAmazonString;
            followeeId: IAmazonString;
        };
    };
    eventName: string;
}

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        throw new Error("Event lacks Records");
    }
    console.log("Event records", event.Records.length);

    const followersCounts = new Map<string, number>();
    const followingCounts = new Map<string, number>();

    for (const record of event.Records as IRecord[]) {
        if (record.eventName === "MODIFY") {
            continue;
        }

        const { followerId, followeeId } = (record.dynamodb.NewImage ||
            record.dynamodb.OldImage)!;

        const followingCount = followingCounts.get(followerId.S);
        const followersCount = followersCounts.get(followeeId.S);

        if (record.eventName === "INSERT") {
            followingCounts.set(
                followerId.S,
                followingCount ? followingCount + 1 : 1
            );
            followersCounts.set(
                followeeId.S,
                followersCount ? followersCount + 1 : 1
            );
        } else {
            followingCounts.set(
                followerId.S,
                followingCount ? followingCount - 1 : -1
            );
            followersCounts.set(
                followeeId.S,
                followersCount ? followersCount - 1 : -1
            );
        }
    }

    console.log("followersCounts", followersCounts);
    console.log("followingCounts", followingCounts);

    // TODO: roll back if errors

    for (const item of followersCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await incrementFollowersCount(id, count);
            console.log("updated followers count");
        } catch (e) {
            console.log('Error updating followers count', e);
        }
    }

    for (const item of followingCounts) {
        const id = item[0];
        const count = item[1];

        try {
            await incrementFollowingCount(id, count);
            console.log("updated following counts");
        } catch (e) {
            console.log('Error updating following count', e);
        }
    }
}

async function incrementFollowersCount(userId: string, count: number) {
    const input = {
        userId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementUserFollowersCount, 'IncrementUserFollowersCount', { input });
    console.log('result', result);
    return result;
}

async function incrementFollowingCount(userId: string, count: number) {
    const input = {
        userId,
        count,
    };

    const result = await RunAppSyncQuery(mutations.incrementUserFollowingCount, 'IncrementUserFollowingCount', { input });
    console.log('result', result);
    return result;
}
