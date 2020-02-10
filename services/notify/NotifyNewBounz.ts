import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { SendDeepLink } from './shared/Notification';


const dynamo = new AWS.DynamoDB.DocumentClient();

export async function handler(event: any, context: Context) {
    if (!event.Records) {
        console.log('No Records field');
        return;
    }

    for (const record of event.Records) {
        if (record.eventName !== 'INSERT') {
            console.log('Non-insert event ignored', record);
            continue;
        }

        console.log('record', record);

        const postId = record.dynamodb.NewImage.postId.S;
        const bounzerId = record.dynamodb.NewImage.bounzerId.S;
        const creatorId = postId.split(';')[0];

        const bounzer = await getUserInfo(bounzerId);
        
        const title = 'New bounz';
        const body = `${bounzer.username} has bounzed your post`;
        const deeplink = `bounz://post/${postId}`;

        await SendDeepLink(creatorId, title, body, deeplink);
        
    }
};

async function getUserInfo(userId: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
        Key: {
            userId,
        }
    }

    const result = await dynamo.get(params).promise();

    if (!result.Item) {
        throw new Error('User does not exist');
    }

    return result.Item;
}