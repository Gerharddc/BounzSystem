/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import * as redis from 'redis';
import { promisify } from 'util';

const dynamo = new AWS.DynamoDB.DocumentClient();

const client = redis.createClient({ host: process.env.REDIS_HOST });
const zrevrange = promisify(client.zrevrange).bind(client);
const flushall = promisify(client.flushall).bind(client);

export async function handler(event: any, context: Context) {
    // console.log('event', event);

  try{  
    if (!event.queryStringParameters.id) {
        throw new Error('Event lacks id');
    }

    //  await flushall();

    const res = await zrevrange(event.queryStringParameters.id, 0, -1, 'WITHSCORES');

    const scores = [];
    for (let i = 0; i < res.length / 2; i++) {
        const id = res[i * 2];
        const score = res[i * 2 + 1];

        const court = await getCourtInfo(id);
        const name = court.name;
        const image = calculateCourtPicUrl(court as any);

        scores.push({ id, score, name, image });
    }

    const response = {
        statusCode: 200,
        headers: {
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ scores })
    }

    return response;
  } catch (e) {
      console.log(e);
      const response = {
        statusCode: 500,
        body: JSON.stringify({ error: e.message })
      };

      return response;
  }
};

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

const baseImgUrl =  'https://' + process.env.PUBLIC_IMAGES_DOMAIN + '/court-pics/';
export function calculateCourtPicUrl(court: { courtId: string, imageRev: number }) {
    return baseImgUrl + court.courtId + '-' + court.imageRev + '.jpg';
}