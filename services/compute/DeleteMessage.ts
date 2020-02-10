/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
  if (!event.messengerId) {
    throw new Error("Event lacks messengerId");
  }
  const messengerId = event.messengerId;

  if (!event.messageDate) {
    throw new Error("Event lacks messageDate");
  }
  const messageDate = event.messageDate;

  if (!event.threadId) {
    throw new Error("Event lacks threadId");
  }
  const threadId = event.threadId;

  console.log(
    `Deleting comment on ${threadId} from ${messengerId} at ${messageDate}`
  );

  const message = await getMessage(threadId, messageDate);
  if (!message) {
    throw new Error("Message does not exist");
  }

  if (message.messengerId !== messengerId) {
    //await flagUser(commentorId, 'Provided incorrect commentorId to delete comment', 5);
    throw new Error("Incorrect messengerId");
  }

  const result = await deleteMessage(threadId, messageDate);

  console.log("Completed");
  return result;
}

async function getMessage(threadId: string, messageDate: string) {
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    Key: {
      threadId,
      messageDate,
    }
  };

  return (await dynamo.get(params).promise()).Item;
}

async function deleteMessage(threadId: string, messageDate: string) {
  const params = {
    TableName: process.env.MESSAGES_TABLE,
    ReturnValues: "ALL_OLD",
    Key: {
      threadId,
      messageDate,
    }
  };

  return (await dynamo.delete(params).promise()).Attributes;
}
