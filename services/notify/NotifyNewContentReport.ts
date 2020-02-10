/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Marco van der Merwe
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const ses = new AWS.SES();

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

        const textBody = JSON.stringify(record.dynamodb.NewImage, undefined, 2);

        const params = {
            Destination: {
                ToAddresses: ['gerhard@bounz.io']
            },
            Message: {
                Body: {
                    Text: {
                        Charset: "UTF-8",
                        Data: textBody
                    }
                },
                Subject: {
                    Charset: "UTF-8",
                    Data: "New content report"
                }
            },
            Source: "Bounz Server <server@bounz.io>"
        };

        await ses.sendEmail(params).promise();
    }
};
