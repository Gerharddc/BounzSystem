/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Handler } from "aws-lambda";
import RunAppSyncQuery from "./shared/RunAppSyncQuery";
import * as mutations from './shared/graphql/mutations';

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

export const handler: Handler = async (event, context, callback) => {
  if (!event.Records) {
    throw new Error("Event lacks Records");
  }
  console.log("Event records", event.Records.length);

  const madeCounts = new Map<string, number>();
  const receivedCounts = new Map<string, number>();
  const postCounts = new Map<string, number>();

  for (const record of event.Records as IRecord[]) {
    if (record.eventName === "MODIFY") {
      continue;
    }

    const { bounzerId, postId, bounzedDate } = (record.dynamodb.NewImage ||
      record.dynamodb.OldImage)!;

    const parts = postId.S.split(";");
    const creatorId = parts[0];
    // const postedDate = parts[1];

    const madeCount = madeCounts.get(bounzerId.S);
    const receivedCount = receivedCounts.get(creatorId);
    const postCount = postCounts.get(postId.S);

    if (record.eventName === "INSERT") {
      madeCounts.set(bounzerId.S, madeCount ? madeCount + 1 : 1);
      receivedCounts.set(creatorId, receivedCount ? receivedCount + 1 : 1);
      postCounts.set(postId.S, postCount ? postCount + 1 : 1);
    } else {
      madeCounts.set(bounzerId.S, madeCount ? madeCount - 1 : -1);
      receivedCounts.set(creatorId, receivedCount ? receivedCount - 1 : -1);
      postCounts.set(postId.S, postCount ? postCount - 1 : -1);
    }
  }

  console.log("madeCounts", madeCounts);
  console.log("receivedCounts", receivedCounts);
  console.log("postCount", postCounts);

  // TODO: roll back if errors

  for (const item of madeCounts) {
    const id = item[0];
    const count = item[1];

    try {
      await incrementBounzesMade(id, count);
      console.log("updated bounzes made");
    } catch (e) {
      console.log('error updating bounzes made', e)
    }
  }

  for (const item of receivedCounts) {
    const id = item[0];
    const count = item[1];

    try {
      await incrementBounzesReceived(id, count);
      console.log("updated bounzes received");
    } catch (e) {
      console.log('error updating bounzes received', e)
    }
  }

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

    try {
      await incrementPostBounzes(creatorId, postedDate, count);
      console.log("updated post bounzes");
    } catch (e) {
      console.log('error updating post bounzes', e)
    }
  }

  console.log("Completed");
};

async function incrementBounzesReceived(userId: string, count: number) {
  const input = {
    userId,
    count
  };

  const result = await RunAppSyncQuery(mutations.incrementUserBounzesReceived, "IncrementUserBounzesReceived", {
    input
  });
  console.log("result", result);
  return result;
}

async function incrementBounzesMade(userId: string, count: number) {
  const input = {
    userId,
    count
  };

  const result = await RunAppSyncQuery(mutations.incrementUserBounzesMade, "IncrementUserBounzesMade", {
    input
  });
  console.log("result", result);
  return result;
}

async function incrementPostBounzes(creatorId: string, postedDate: string, count: number) {
  const input = {
    creatorId,
    postedDate,
    count
  };

  const result = await RunAppSyncQuery(mutations.incrementSentPostBounzes, "IncrementSentPostBounzes", {
    input
  });
  console.log("result", result);
  return result;
}
