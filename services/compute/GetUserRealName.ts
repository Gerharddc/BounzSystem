/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import * as AWS from "aws-sdk";
import { checkBlocked } from "./shared/CheckBlocked";

const userPool = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });

let USER_POOL_ID;

export async function handler(event: any, context: Context) {
    if (!USER_POOL_ID) {
        const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
        USER_POOL_ID = resp.Parameter.Value;
    }

    if (!event.userId) {
        throw new Error("Event lacks userId");
    }
    const userId = event.userId;

    if (!event.requesterId) {
        throw new Error("Event lacks requesterId");
    }
    const requesterId = event.requesterId;

    let realName;

    if (await checkBlocked(userId, requesterId)) {
        console.log('Blocked so sending ghost');
        realName = 'Ghost';
    } else {
        realName = await getName(userId);
    }

    console.log('realName', realName);
    return realName;
}

async function getName(id: string) {
    const params = {
        UserPoolId: USER_POOL_ID,
        Username: id
    }
    const user = await userPool.adminGetUser(params).promise();
    const attribs = user.UserAttributes;

    const map = new Map();
    for (const attrib of attribs) {
        map.set(attrib.Name, attrib.Value);
    }

    return map.get('name') + ' ' + map.get('family_name');
}
