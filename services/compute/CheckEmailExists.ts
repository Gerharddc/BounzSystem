/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const cognito = new AWS.CognitoIdentityServiceProvider();
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });

let USER_POOL_ID;

export async function handler(event: any, context: Context) {
    console.log('event', event);

  try{  
    if (!event.queryStringParameters.email) {
        throw new Error('Event lacks email');
    }

    const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
    USER_POOL_ID = resp.Parameter.Value;

    const email = event.queryStringParameters.email;

    const params = {
        UserPoolId: USER_POOL_ID, // TODO
        AttributesToGet: [],
        Filter: `email = \"${email}\"`,
    }

    const result = await cognito.listUsers(params).promise();
    const exists = result.Users.length > 0

    const response = {
        statusCode: 200,
        body: JSON.stringify({ exists })
    }

    return response;
  } catch (e) {
      const response = {
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      };

      return response;
  }
};