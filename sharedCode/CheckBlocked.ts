/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from "aws-sdk";

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function checkBlocked(blockerId: string, blockeeId: string) {
  const params = {
    TableName: process.env.BLOCKED_USERS_TABLE,
    Key: {
      blockerId,
      blockeeId
    }
  };

  return (await dynamo.get(params).promise()).Item;
}

export async function checkIgnored(ignorerId: string, courtId: string) {
  const params = {
    TableName: process.env.IGNORED_COURTS_TABLE,
    Key: {
      ignorerId,
      courtId
    }
  };

  return (await dynamo.get(params).promise()).Item;
}
