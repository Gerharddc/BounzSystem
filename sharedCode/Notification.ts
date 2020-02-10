/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from 'aws-sdk';
AWS.config.region = 'us-east-1';

const pinpoint = new AWS.Pinpoint();

export async function SendDeepLink(userId: string, title: string, body: string, deeplink: string) {
	const message = {
        Action: 'DEEP_LINK',
        Title: title,
        Body: body,
        Url: deeplink,
    }

    const Users = {};
    Users[userId] = {};
    
    const params = {
        ApplicationId: process.env.PINPOINT_APP_ID,
        SendUsersMessageRequest: {
            MessageConfiguration: {
                APNSMessage: message,
                GCMMessage: message,
            },
            Users,
        }
    }
    
    return await pinpoint.sendUsersMessages(params).promise();
}