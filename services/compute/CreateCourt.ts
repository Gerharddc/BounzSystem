/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as uuidv4 from 'uuid/v4';
import * as AWS from 'aws-sdk';
import { extractImageFromS3, isImageSafe, getAspectRatio } from './shared/Images';
import * as isJpg from 'is-jpg';

const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

const MAX_IMAGE_SIZE = 500000;

export async function handler(event: any, context: Context) {
    console.log('event', event);

    if (!event.ownerId) {
        throw new Error('Event lacks ownerId');
    }
    const ownerId = event.ownerId;

    if (!event.name) {
        throw new Error('Event lacks name');
    }
    const name = event.name.trim();

    if (name.length > 50) {
        throw new Error('Name too long');
    }

    if (!event.description) {
        throw new Error('Event lacks description');
    }
    const description = event.description.trim();

    if (description.length > 1000) {
        throw new Error('Description too long');
    }

    if (!event.restricted) {
        throw new Error('Event lacks restricted');
    }
    const restricted = event.restricted; // TODO: check valid boolean

    if (!event.color) {
        throw new Error('Event lacks color');
    }
    const color = event.color; // TODO: check valid colour

    if (await checkCourtNameExists(name)) {
        throw new Error('Court with name already exists');
    }

    if (!event.image) {
        throw new Error('Called without image');
    }
    const image = await extractImageFromS3(event.image);

    if (image.byteLength > MAX_IMAGE_SIZE) {
        throw new Error('Image too large');
    } else {
        console.log('Image size', image.byteLength);
    }

    if (!isJpg(image)) {
        throw new Error('Image is not a jpeg');
    }

    const aspectRatio = await getAspectRatio(image);
    if (Math.abs(aspectRatio - (16 / 9)) > 0.01) { // Avoid floating point issues
        throw new Error('Invalid aspect ratio: ' + aspectRatio);
    }

    let courtId: string;
    do {
        courtId = uuidv4();
    } while (await checkCourtIdExists(courtId))
    console.log('Creating court with id: ', courtId);

    if (!(await isImageSafe(image))) {
        throw new Error('Explicit images are not allowed');
    }

    await saveCourtImage(image, courtId);
    const court = await createCourt(courtId, name, ownerId, description, restricted, color);
    await createMember(courtId, ownerId);

    return court;
};

async function checkCourtIdExists(courtId: string) {
    const params = {
        TableName: process.env.COURT_INFO_TABLE,
        KeyConditionExpression: 'courtId = :i',
        ExpressionAttributeValues: {
            ':i': courtId,
        }
    }

    const result = await dynamo.query(params).promise();
    return (result.Items && result.Items.length > 0);
}

async function checkCourtNameExists(name: string) {
    const params = {
        TableName: process.env.COURT_INFO_TABLE,
        IndexName: 'name-index',
        KeyConditionExpression: '#n = :n',
        ExpressionAttributeNames: {
            '#n': 'name',
        },
        ExpressionAttributeValues: {
            ':n': name,
        }
    }

    const result = await dynamo.query(params).promise();
    return (result.Items && result.Items.length > 0);
}

async function createCourt(courtId: string, name: string, ownerId: string, description: string, restricted: boolean, color: string) {
    const Item = {
        courtId,
        ownerId,
        name,
        description,
        memberCount: 0,
        postCount: 0,
        verified: false,
        restricted,
        color,
        imageRev: 0,
    }

    const params = {
        TableName: process.env.COURT_INFO_TABLE,
        Item,
    }

    await dynamo.put(params).promise();
    return Item;
}

async function saveCourtImage(image: Buffer, courtId: string, imageRev = 0) {
    const params = {
        Body: image,
        Bucket: process.env.PUBLIC_IMAGES_BUCKET,
        Key: `court-pics/${courtId}-${imageRev}.jpg`,
    };

    return await s3.putObject(params).promise();
}

async function createMember(courtId: string, memberId: string) {
    const Item = {
        courtId,
        memberId,
    }

    const params = {
        TableName: process.env.COURT_MEMBERS_TABLE,
        Item,
    }

    await dynamo.put(params).promise();
    return Item;
}