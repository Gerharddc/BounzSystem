/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from 'aws-sdk';
import * as sharp from 'sharp';

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();

export interface IBucketObject {
    key: string;
    bucket: string;
}

export async function extractImageFromS3(object: IBucketObject): Promise<Buffer> {
    const params = {
        Bucket: object.bucket,
        Key: object.key,
    };

    const data = await s3.getObject(params).promise();

    if (!(data.Body instanceof Buffer)) {
        throw new Error('Data body not instance of buffer');
    }

    return data.Body;
}

export async function isImageSafe(image: Buffer) {
    const params = {
        Image: {
            Bytes: image,
        },
        MinConfidence: 70,
    };

    const data = await rekognition.detectModerationLabels(params).promise();
    console.log('moderation data', data);

    if (data.ModerationLabels) {
        for (const label of data.ModerationLabels) {
            if (label.ParentName === 'Explicit Nudity') {
                return false;
            }
        }
    }

    return true;
}

export async function getAspectRatio(image: Buffer) {
    const img = sharp(image);
    const metadata = await img.metadata();
    
    if (!metadata.width || !metadata.height) {
        throw new Error('Metadata missing dimensions');
    }

    return metadata.width / metadata.height;
}
