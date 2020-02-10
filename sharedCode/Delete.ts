/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();

export async function deleteRecords<T>(records: T[], tableName: string) {
    console.log('Deleting: ', records);

    if (!records || records.length < 1) {
        console.log('No records to delete');
        return;
    }

    if (records.length > 25) {
        throw new Error('Can delete a maxmimum of 25 records at a time');
    }

    const params = {
        RequestItems: {} as any,
    };

    params.RequestItems[tableName] = records.map((record) => ({
        DeleteRequest: { Key: record },
    }));

    await dynamo.batchWrite(params).promise();
}

export async function deleteS3Objects(bucket: string, prefix: string) {
    // TODO: this thing does not handle limits

    console.log('Deleting ' + prefix + ' from ' + bucket);

    const params = {
        Bucket: bucket,
        Prefix: prefix,
    };

    const data = await s3.listObjects(params).promise();
    console.log('data', data);
    const Objects = data.Contents.map((item) => ({ Key: item.Key }));

    console.log('Deleting ' + Objects.length + ' objects');

    if (Objects.length > 0) {
        const params2 = {
            Bucket: bucket,
            Delete: { Objects },
        }

        const result = await s3.deleteObjects(params2).promise();
        console.log('result', JSON.stringify(result));

        if (result.Errors && result.Errors.length > 0) {
            throw new Error(JSON.stringify(result.Errors));
        }

        return result;
    }
}