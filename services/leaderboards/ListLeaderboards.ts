/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from 'aws-lambda';

const competitions = [
    {
        id: "rescomp",
        title: "The res that can Bounz",
        description: "Let's see which res can Bounz",
        image: "https://is1-ssl.mzstatic.com/image/thumb/Purple71/v4/47/cf/cf/47cfcf79-9e1d-b21f-8e10-2658b7650c15/mzl.oiljceng.png/246x0w.jpg"
    }
]

export async function handler(event: any, context: Context) {
    try {
        const response = {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*"
            },
            body: JSON.stringify({ competitions })
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