/**
 * Copyright (c) 2019-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import * as AWS from 'aws-sdk';
import * as twitter from 'twitter-text';

const dynamo = new AWS.DynamoDB.DocumentClient();

export async function tagifyMentions(text: string) {
    const mentions = new Set(twitter.extractMentions(text));

    const userMap = new Map();
    const getAndSet = async (username) => {
        const user = await getUser(username);
        userMap.set(username, { username, ...user });
    }

    const ps = [];
    for (const mention of mentions) {
        ps.push(getAndSet(mention));
    }

    await Promise.all(ps);

    let newString = text;
    for (const key of userMap.keys()) {
        const user = userMap.get(key);
        const tag = `<Mention type="user" id="${user.userId}" display="@${user.username}" />`;
        newString = newString.replace('@' + key, tag);
    }

    return newString;
}

async function getUser(username: string) {
    const params = {
        TableName: process.env.USER_INFO_TABLE,
        IndexName: 'username_lcase-index',
        KeyConditionExpression: 'username_lcase = :u',
        ExpressionAttributeValues: {
            ':u': username.toLocaleLowerCase(),
        },
    };

    const data = await dynamo.query(params).promise();

    if (data.Items.length < 1) {
        throw new Error(username + ' is not a user');
    }

    return data.Items[0];
}