/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import * as path from "path";
import { extractImageFromS3, isImageSafe, getAspectRatio } from "./shared/Images";
import * as isJpg from 'is-jpg';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const MAX_IMAGE_SIZE = 150000;
const ROOT_DIR = "profile-pics";
const EXT = ".jpg";

export async function handler(event: any, context: Context) {
  if (!event.userId) {
    throw new Error("Called without userId");
  }
  const userId = event.userId;

  console.log('Updating pic for: ', userId);

  if (!event.image) {
    throw new Error("Called without image");
  }
  const image = await extractImageFromS3(event.image);

  if (image.byteLength > MAX_IMAGE_SIZE) {
    throw new Error("Image too large");
  } else {
    console.log("Image size", image.byteLength);
  }

  if (!isJpg(image)) {
    throw new Error('Image is not a jpeg');
  }

  const aspectRatio = await getAspectRatio(image);
  if (Math.abs(aspectRatio - 1) > 0.001) { // Avoid floating point issues
    throw new Error('Invalid aspect ratio');
  }

  if (!(await isImageSafe(image))) {
    // await retry(RETRY_COUNT, flagUser, identitiyId, 'Profile Picture invalid:' + bucketName, 5);
    throw new Error("Explicit images are not allowed");
  }

  const revs = await oldRevs(userId);
  let newRev = 1;
  if (revs) {
    console.log("Old rev count", revs.length);
    newRev = maxRev(revs) + 1;

    await deleteRevs(userId, revs);
    console.log(`Deleted ${revs.length} old revisions`);
  } else {
    console.log("No old revs");
  }

  await saveProfilePic(image, userId, newRev);
  console.log("Saved image");

  const user = await updateUserRev(userId, newRev);
  console.log("Updated user rev");

  return user;
}

function idFromKey(key: string) {
  // i.e. profile-pics/us-east-1:0cbfd573-e688-449f-a9f2-272edfb70605-0.jpg
  const name = path.parse(key).name;

  const splitIdx = name.lastIndexOf("-");
  const userId = name.slice(0, splitIdx);
  const rev = Number.parseInt(name.slice(splitIdx + 1), 10);

  return { userId, rev };
}

function userFolder(userId: string) {
  return ROOT_DIR + "/" + userId;
}

function revKey(userId: string, rev: number) {
  return userFolder(userId) + "-" + rev + EXT;
}

async function deleteRevs(userId: string, revs: number[]) {
  // TODO: maybe there is a limit here

  if (revs.length < 1) {
    return;
  }

  const Objects = revs.map(rev => ({ Key: revKey(userId, rev) }));
  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Delete: { Objects }
  };

  const result = await s3.deleteObjects(params).promise();

  if (result.Errors && result.Errors.length > 0) {
    throw new Error(JSON.stringify(result.Errors));
  }

  return result;
}

async function oldRevs(userId: string): Promise<number[]> {
  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Prefix: userFolder(userId)
  };

  const data = await s3.listObjects(params).promise();

  if (!data.Contents) {
    throw new Error("No contents for S3 data");
  }

  const revs = [];

  for (const item of data.Contents) {
    if (!item.Key) {
      throw new Error("No key for item");
    }

    const { rev } = idFromKey(item.Key);
    revs.push(rev);
  }

  return revs;
}

function maxRev(revs: number[]) {
  let max = 0;

  for (const rev of revs) {
    if (rev > max) {
      max = rev;
    }
  }

  return max;
}

async function updateUserRev(userId: string, rev: number) {
  const params = {
    TableName: process.env.USER_INFO_TABLE,
    Key: { userId },
    UpdateExpression: "set profilePicRev = :r",
    ExpressionAttributeValues: {
      ":r": rev
    },
    ReturnValues: "ALL_NEW"
  };

  return (await dynamo.update(params).promise()).Attributes;
}

async function saveProfilePic(image: Buffer, userId: string, rev = 0) {
  const params = {
    Body: image,
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Key: ROOT_DIR + "/" + userId + "-" + rev + EXT
  };

  return await s3.putObject(params).promise();
}
