/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { deleteRecords } from "./shared/Delete";

const dynamo = new AWS.DynamoDB.DocumentClient();
const S3 = new AWS.S3();

interface IAmazonString {
  S: string;
}

interface IRecord {
  dynamodb: {
    OldImage?: {
      creatorId: IAmazonString;
      postedDate: IAmazonString;
    };
  };
  eventName: string;
}

export async function handler(event: any, context: Context) {
  if (!event.Records) {
    throw new Error("Event lacks Records");
  }
  console.log("Event records", event.Records.length);

  for (const record of event.Records as IRecord[]) {
    if (record.eventName !== "REMOVE") {
      continue;
    }

    const { creatorId, postedDate } = record.dynamodb.OldImage!;
    const postId = creatorId.S + ";" + postedDate.S;
    console.log("Deleting data related to: ", postId);

    const p1 = deleteBounzesForSentPost(postId);
    const p2 = deleteCommentsForSentPost(postId);
    const p3 = deleteReceivedPostsForSentPost(postId);
    const p4 = deletePostRelatedImages(creatorId.S, postedDate.S);
    // TODO: delete post reports
    await Promise.all([p1, p2, p3, p4]);
  }

  // TODO: roll back if errors

  console.log("Completed");
}

async function getBounzesForSentPost(postId: string, ExclusiveStartKey?: any): Promise<{ items: any; LastEvaluatedKey: any }> {
  const params = {
    TableName: process.env.BOUNZES_TABLE,
    IndexName: "postId-index",
    ProjectionExpression: "bounzerId, postId",
    ExclusiveStartKey,
    Limit: 25,
    KeyConditionExpression: "postId = :i",
    ExpressionAttributeValues: {
      ":i": postId
    }
  };

  const data = await dynamo.query(params).promise();
  return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getCommentsForSentPost(postId: string, ExclusiveStartKey?: any): Promise<{ items: any; LastEvaluatedKey: any }> {
  const params = {
    TableName: process.env.COMMENTS_TABLE,
    ProjectionExpression: "postId, commentDate",
    ExclusiveStartKey,
    Limit: 25,
    KeyConditionExpression: "postId = :i",
    ExpressionAttributeValues: {
      ":i": postId
    }
  };

  const data = await dynamo.query(params).promise();
  return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function getReceivedPostsForSentPost(postId: string, ExclusiveStartKey?: any): Promise<{ items: any; LastEvaluatedKey: any }> {
  const params = {
    TableName: process.env.RECEIVED_POSTS_TABLE,
    IndexName: "postId-index",
    ProjectionExpression: "receiverId, postId",
    ExclusiveStartKey,
    Limit: 25,
    KeyConditionExpression: "postId = :i",
    ExpressionAttributeValues: {
      ":i": postId
    }
  };

  const data = await dynamo.query(params).promise();
  return { items: data.Items, LastEvaluatedKey: data.LastEvaluatedKey };
}

async function deleteBounzesForSentPost(postId: string) {
  console.log("Deleting bounzed posts for SentPost:", postId);

  let lastKey: any;
  do {
    const { items, LastEvaluatedKey } = await getBounzesForSentPost(
      postId,
      lastKey
    );
    lastKey = LastEvaluatedKey;

    await deleteRecords(items, process.env.BOUNZES_TABLE);
  } while (lastKey);
}

async function deleteCommentsForSentPost(postId: string) {
  console.log("Deleting comments for SentPost:", postId);

  let lastKey: any;
  do {
    const { items, LastEvaluatedKey } = await getCommentsForSentPost(
      postId,
      lastKey
    );
    lastKey = LastEvaluatedKey;

    await deleteRecords(items, process.env.COMMENTS_TABLE);
  } while (lastKey);
}

async function deleteReceivedPostsForSentPost(postId: string) {
  console.log("Deleting ReceivedPosts for SentPosts: ", postId);

  let lastKey: any;
  do {
    const { items, LastEvaluatedKey } = await getReceivedPostsForSentPost(
      postId,
      lastKey
    );
    lastKey = LastEvaluatedKey;

    await deleteRecords(items, process.env.RECEIVED_POSTS_TABLE);
  } while (lastKey);
}

async function listImagesForPost(creatorId: string, postedDate: string) {
  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Prefix: `posts/${creatorId}/${postedDate}`
  };

  const keys = [];
  const res = await S3.listObjects(params).promise();
  if (res.Contents) {
    for (const item of res.Contents) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }
  }

  return keys;
}

async function deleteImages(keys: string[]) {
  console.log("Deleting images: ", keys);

  if (keys.length < 1) {
    return;
  }

  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Delete: {
      Objects: keys.map(Key => ({ Key }))
    }
  };

  const res = await S3.deleteObjects(params).promise();
  console.log('s3 res', res);

  if (res.Errors && res.Errors.length > 0) {
    throw new Error(JSON.stringify(res.Errors));
  }

  return res;
}

async function deletePostRelatedImages(creatorId: string, postedDate: string) {
  console.log("Deleting images related to post");

  const postKeys = await listImagesForPost(creatorId, postedDate);
  await deleteImages(postKeys);
}
