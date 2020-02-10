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
const ROOT_DIR = "court-pics";
const EXT = ".jpg";

export async function handler(event: any, context: Context) {
  if (!event.courtId) {
    throw new Error("Called without courtId");
  }
  const courtId = event.courtId;

  console.log('Updating pic for: ', courtId)

  if (!event.ownerId) {
    throw new Error("Called without ownerId");
  }
  const courtInfo = await getCourtInfo(courtId);

  if (event.ownerId != courtInfo.ownerId) {
    throw new Error("UserId does not match ownerId");
  }

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
  if (Math.abs(aspectRatio - (16 / 9)) > 0.001) { // Avoid floating point issues
    throw new Error('Invalid aspect ratio');
  }

  if (!(await isImageSafe(image))) {
    // await retry(RETRY_COUNT, flagCourt, identitiyId, 'Profile Picture invalid:' + bucketName, 5);
    throw new Error("Explicit images are not allowed");
  }

  const revs = await oldRevs(courtId);
  let newRev = 1;
  if (revs) {
    console.log("Old rev count", revs.length);
    newRev = maxRev(revs) + 1;

    await deleteRevs(courtId, revs);
    console.log(`Deleted ${revs.length} old revisions`);
  } else {
    console.log("No old revs");
  }

  await saveCourtPic(image, courtId, newRev);
  console.log("Saved image");

  const court = await updateCourtRev(courtId, newRev);
  console.log("Updated court rev");

  return court;
}

function idFromKey(key: string) {
  // i.e. profile-pics/us-east-1:0cbfd573-e688-449f-a9f2-272edfb70605-0.jpg
  const name = path.parse(key).name;

  const splitIdx = name.lastIndexOf("-");
  const courtId = name.slice(0, splitIdx);
  const rev = Number.parseInt(name.slice(splitIdx + 1), 10);

  return { courtId, rev };
}

function courtFolder(courtId: string) {
  return ROOT_DIR + "/" + courtId;
}

function revKey(courtId: string, rev: number) {
  return courtFolder(courtId) + "-" + rev + EXT;
}

async function deleteRevs(courtId: string, revs: number[]) {
  // TODO: maybe there is a limit here

  if (revs.length < 1) {
    return;
  }

  const Objects = revs.map(rev => ({ Key: revKey(courtId, rev) }));
  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Delete: { Objects }
  };

  return await s3.deleteObjects(params).promise();
}

async function oldRevs(courtId: string): Promise<number[]> {
  const params = {
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Prefix: courtFolder(courtId)
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

async function updateCourtRev(courtId: string, rev: number) {
  const params = {
    TableName: process.env.COURT_INFO_TABLE,
    Key: { courtId },
    UpdateExpression: "set imageRev = :r",
    ExpressionAttributeValues: {
      ":r": rev
    },
    ReturnValues: "ALL_NEW"
  };

  return (await dynamo.update(params).promise()).Attributes;
}

async function getCourtInfo(courtId: string) {
  const params = {
    TableName: process.env.COURT_INFO_TABLE,
    Key: {
      courtId,
    }
  }

  const result = await dynamo.get(params).promise();

  if (!result.Item) {
    throw new Error('Court does not exist');
  }

  return result.Item;
}

async function saveCourtPic(image: Buffer, courtId: string, rev = 0) {
  const params = {
    Body: image,
    Bucket: process.env.PUBLIC_IMAGES_BUCKET,
    Key: ROOT_DIR + "/" + courtId + "-" + rev + EXT
  };

  return await s3.putObject(params).promise();
}