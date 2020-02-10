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

        const followerId = record.dynamodb.NewImage.followerId.S;
        const followeeId = record.dynamodb.NewImage.followeeId.S;

        const follower = await getUserInfo(followerId);
        
        const title = 'New Follower';
        const body = `${follower.username} has started following you`;
        const deeplink = `bounz://user/${followerId}`;

        await SendDeepLink(followeeId, title, body, deeplink);
        
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

