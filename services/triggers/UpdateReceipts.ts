/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
const dynamo = new AWS.DynamoDB.DocumentClient();

interface IAmazonString {
  S: string;
}

interface IRecord {
  dynamodb: {
    NewImage?: {
      creatorId: IAmazonString;
      receivedDate: IAmazonString;
      bounzerId: IAmazonString;
      postId: IAmazonString;
    };
    OldImage?: {
      creatorId: IAmazonString;
      receivedDate: IAmazonString;
      bounzerId: IAmazonString;
      postId: IAmazonString;
    };
  };
  eventName: string;
}

export async function handler(event: any, context: Context) {
  if (!event.Records) {
    throw new Error("Event lacks Records");
  }
  console.log("Event records", event.Records.length);

  const userCounts = new Map<string, number>();
  const postCounts = new Map<string, number>();

  for (const record of event.Records as IRecord[]) {
    if (record.eventName === "MODIFY") {
      continue;
    }

    const image = (record.dynamodb.NewImage || record.dynamodb.OldImage)!;
    const postId = image.postId.S;

    const parts = postId.split(";");
    const creatorId = parts[0];

    const userCount = userCounts.get(creatorId);
    const postCount = postCounts.get(postId);

    if (record.eventName === "INSERT") {
      userCounts.set(creatorId, userCount ? userCount + 1 : 1);
      postCounts.set(postId, postCount ? postCount + 1 : 1);
    } else {
      userCounts.set(creatorId, userCount ? userCount - 1 : -1);
      postCounts.set(postId, postCount ? postCount - 1 : -1);
    }
  }

  console.log("userCounts", userCounts);
  console.log("postCounts", postCounts);

  // TODO: roll back if errors

  for (const item of userCounts) {
    const id = item[0];
    const count = item[1];

    await incrementUserReceipts(id, count);
    console.log("updated user receipts");
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

    await incrementPostReceipts(creatorId, postedDate, count);
    console.log("updated post receipts");
  }
}

async function incrementUserReceipts(userId: string, count: number) {
  const params = {
    TableName: process.env.USER_INFO_TABLE,
    Key: { userId },
    UpdateExpression: "ADD receipts :c",
    // Ensure we don't accidentally create a record
    ConditionExpression: "userId = :i",
    ExpressionAttributeValues: {
      ":i": userId,
      ":c": count
    }
  };

  try {
    await dynamo.update(params).promise();
  } catch (e) {
    if (e.code === "ConditionalCheckFailedException") {
      console.log("Tried to update non-existent record");
    } else {
      throw e;
    }
  }
}

async function incrementPostReceipts(creatorId: string, postedDate: string, count: number) {
  const params = {
    TableName: process.env.SENT_POSTS_TABLE,
    Key: { creatorId, postedDate },
    UpdateExpression: "ADD receipts :c",
    // Ensure we don't accidentally create a record
    ConditionExpression: "creatorId = :i and postedDate = :p",
    ExpressionAttributeValues: {
      ":i": creatorId,
      ":p": postedDate,
      ":c": count
    }
  };

  try {
    await dynamo.update(params).promise();
  } catch (e) {
    if (e.code === "ConditionalCheckFailedException") {
      console.log("Tried to update non-existent record");
    } else {
      throw e;
    }
  }
}
