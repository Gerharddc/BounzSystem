/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { extractImageFromS3, isImageSafe } from "./shared/Images";
import * as sharp from "sharp";
import * as isJpg from 'is-jpg';
import { tagifyMentions } from "./shared/TagifyMentions";

const vibrant = require("node-vibrant");

const dynamo = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

const MAX_IMAGE_SIZE = 500000;
const THUMB_HEIGHT = 600;
const ROOT_DIR = "posts";

export async function handler(event: any, context: Context) {
    const postedDate = new Date().toISOString();

    if (!event.creatorId) {
        throw new Error('Event lacks creatorId');
    }
    const creatorId = event.creatorId;

    if (!event.caption) {
        throw new Error("Event lacks caption");
    }
    const caption = event.caption.trim();

    if (caption.length > 1000) {
        throw new Error('Caption too long');
    }

    if (!event.image) {
        throw new Error("Called without image");
    }

    const courtId = event.courtId
    if (courtId && !(await checkMember(creatorId, courtId))) {
        throw new Error('Poster is not a member of the court');
    }

    const img = await extractImageFromS3(event.image);

    if (img.byteLength > MAX_IMAGE_SIZE) {
        throw new Error("Image file size is too large");
    }

    console.log(`Post of size ${img.byteLength} from ${creatorId}`);

    if (!isJpg(img)) {
        throw new Error('Image is not a jpeg');
    }

    if (!(await isImageSafe(img))) {
        throw new Error("Explicit images are not allowed");
    }

    let thumb, color, aspectRatio;

    const storeAspect = (ar: number) => {
        aspectRatio = ar;
    };

    try {
        thumb = await generateThumbnail(img, storeAspect);
        color = await extractVibrantColor(thumb);
    } catch (e) {
        throw e;
    }

    console.log("Vibrant color", color);

    const MIN_AR = 1 / 8;
    const MAX_AR = 8 / 1;

    console.log('aspectRatio', aspectRatio);
    if (aspectRatio < MIN_AR || aspectRatio > MAX_AR) {
        throw new Error('Invalid aspect ratio');
    }

    // TODO: handle incomplete transactions

    await saveImageAsPost(img, creatorId, postedDate);
    console.log('Uploaded image');

    const tagifiedCaption = await tagifyMentions(caption);
    const sentPost = await createPostRecord(creatorId, postedDate, tagifiedCaption, color, aspectRatio, courtId);

    console.log(`Created ${postedDate} for ${creatorId}`);
    return sentPost;
};

async function generateThumbnail(img: Buffer, storeAspect: (ar: number) => void) {
    // Attempt to use simd for increased performace
    console.log("SIMD", sharp.simd(true));

    const image = sharp(img);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error('Metadata missing dimensions');
    }

    const ar = metadata.width / metadata.height;
    storeAspect(ar);

    return await (await image.resize(undefined, THUMB_HEIGHT)).toBuffer();
}

function extractVibrantColor(img: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
        vibrant.from(img).getPalette((err, palette) => {
            if (err) {
                reject(err);
            } else {
                if (!palette) {
                    console.log("Undefined palette, going black");
                    resolve("#000000");
                } else {
                    const vib = palette.Vibrant;

                    if (!vib) {
                        console.log("Undefined vibrant, going black");
                        resolve("#000000");
                    } else {
                        resolve(vib.getHex());
                    }
                }
            }
        });
    });
}

async function saveImageAsPost(image: Buffer, creatorId: string, postedDate: string) {
    const params = {
        Body: image,
        Bucket: process.env.PUBLIC_IMAGES_BUCKET,
        Key: `${ROOT_DIR}/${creatorId}/${postedDate}.jpg`,
    };

    return await s3.putObject(params).promise();
}

async function createPostRecord(creatorId: string, postedDate: string, caption: string,
    vibrantColor: string, aspectRatio: number, courtId: string) {

    const Item = {
        creatorId,
        postedDate,
        caption,
        vibrantColor,
        bounzes: 0,
        aspectRatio,
        courtId,
    };

    const params = {
        TableName: process.env.SENT_POSTS_TABLE,
        Item,
    };

    await dynamo.put(params).promise();

    return Item;
}

export async function checkMember(memberId: string, courtId: string) {
    const params = {
      TableName: process.env.COURT_MEMBERS_TABLE,
      Key: {
        memberId,
        courtId,
      }
    };
  
    return (await dynamo.get(params).promise()).Item;
  }
