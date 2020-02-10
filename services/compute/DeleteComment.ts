/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
  if (!event.commentorId) {
    throw new Error("Event lacks commentorId");
  }
  const commentorId = event.commentorId;

  if (!event.commentDate) {
    throw new Error("Event lacks commentDate");
  }
  const commentDate = event.commentDate;

  if (!event.postId) {
    throw new Error("Event lacks postId");
  }
  const postId = event.postId;

  console.log(
    `Deleting comment on ${postId} from ${commentorId} at ${commentDate}`
  );

  const comment = await getComment(postId, commentDate);
  if (!comment) {
    throw new Error("Comment does not exist");
  }

  if (comment.commentorId !== commentorId) {
    //await flagUser(commentorId, 'Provided incorrect commentorId to delete comment', 5);
    throw new Error("Incorrect commentorId");
  }

  const result = await deleteComment(postId, commentDate);

  console.log("Completed");
  return result;
}

async function getComment(postId: string, commentDate: string) {
  const params = {
    TableName: process.env.COMMENTS_TABLE,
    Key: {
      postId,
      commentDate
    }
  };

  return (await dynamo.get(params).promise()).Item;
}

async function deleteComment(postId: string, commentDate: string) {
  const params = {
    TableName: process.env.COMMENTS_TABLE,
    ReturnValues: "ALL_OLD",
    Key: {
      postId,
      commentDate
    }
  };

  return (await dynamo.delete(params).promise()).Attributes;
}
