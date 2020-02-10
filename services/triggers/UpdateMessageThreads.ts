/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { extractThreadDetails } from "./shared/ExtractThreadDetails";
const dynamo = new AWS.DynamoDB.DocumentClient();

interface IAmazonString {
  S: string;
}

interface IRecord {
  dynamodb: {
    NewImage?: {
      threadId: IAmazonString;
      messageDate: IAmazonString;
      messengerId: IAmazonString;
      message: IAmazonString;
    };
    OldImage?: {
      threadId: IAmazonString;
      messageDate: IAmazonString;
      messengerId: IAmazonString;
      message: IAmazonString;
    };
  };
  eventName: string;
}

export async function handler(event: any, context: Context) {
  if (!event.Records) {
    throw new Error("Event lacks Records");
  }
  console.log("Event records", event.Records.length);

  const threads = new Set<string>();
  for (const record of event.Records as IRecord[]) {

    if (record.eventName === "INSERT") {
      const threadId = record.dynamodb.NewImage.threadId.S;
      const thread = extractThreadDetails(threadId);
      const messageDate = record.dynamodb.NewImage.messageDate.S;
      if (!thread.userIdA) {
        continue;
      }

      if (thread.userIdA) {
        threads.add(JSON.stringify({ threadId, userId: thread.userIdA, messageDate }));
        threads.add(JSON.stringify({ threadId, userId: thread.userIdB, messageDate }));
      }
    }

    if (record.eventName === "REMOVE") {
      const threadId = record.dynamodb.OldImage.threadId.S;
      console.log('ThreadId: ', threadId);
      const thread = extractThreadDetails(threadId);
      const params = {
        TableName: process.env.MESSAGES_TABLE,
        //IndexName: 'messageDate-index',
        KeyConditionExpression: 'threadId = :u',
        ExpressionAttributeValues: {
          ':u': threadId,
        },
      };

      const messageList = await dynamo.query(params).promise();
      console.log('MessageList: ', messageList);

      const length = messageList.Items.length;

      console.log('Length: ', length);

      const messageDate = messageList.Items[length-1].messageDate;
      console.log('MessageDate: ', messageDate);

      if (!thread.userIdA) {
        continue;
      }

      if (thread.userIdA) {
        threads.add(JSON.stringify({ threadId, userId: thread.userIdA, messageDate }));
        threads.add(JSON.stringify({ threadId, userId: thread.userIdB, messageDate }));
      }
    }

  }

  console.log('threads', threads);

  let ps = [];
  for (const json of threads) {
    const thread = JSON.parse(json);
    ps.push(createThread(thread.userId, thread.threadId, thread.messageDate));
  }

  await Promise.all(ps);
  console.log('Done');
}

async function createThread(userId: string, threadId: string, messageDate: string) {
  await createMessageThreadRecord(userId, threadId, messageDate);
  console.log(`${userId} ${threadId} created`);
}

// TODO: maybe use batch writes for this shit

async function createMessageThreadRecord(userId: string, threadId: string, latestMessageDate: string) {
  console.log('LatestMessageDate: ', latestMessageDate);
  const params = {
    TableName: process.env.MESSAGE_THREADS_TABLE,
    Item: {
      userId,
      threadId,
      latestMessageDate
    }
  };

  return await dynamo.put(params).promise();
}
