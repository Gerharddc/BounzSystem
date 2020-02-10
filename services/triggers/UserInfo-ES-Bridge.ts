/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import { Context } from "aws-lambda";
import { unmarshal, unmarshalItem } from "dynamodb-marshaler";
import * as elasticsearch from "elasticsearch";
import * as AWS from "aws-sdk";

const userPool = new AWS.CognitoIdentityServiceProvider({ apiVersion: "2016-04-18" });
const ssm = new AWS.SSM({ apiVersion: '2014-11-06' });

let USER_POOL_ID;

const es = new elasticsearch.Client({
    hosts: [
        process.env.ELASTICSEARCH_URL
    ],
    connectionClass: require("http-aws-es"),
    apiVersion: "6.3"
});

const TABLE = "userinfo";

export async function handler(event: any, context: Context) {
    if (!USER_POOL_ID) {
        const resp = await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise();
        USER_POOL_ID = resp.Parameter.Value;
    }

    for (const record of event.Records) {
        switch (record.eventName) {
            case "INSERT":
                await insertRecord(record);
                break;
            case "REMOVE":
                await removeRecord(record);
                break;
            case "MODIFY":
                await modifyRecord(record);
                break;
            default:
                console.log("Unknown eventName:", record.eventName);
        }
    }
}

interface IRecord {
    dynamodb: {
        Keys: {
            userId: { S: string };
        };
        NewImage: object;
    };
}

async function insertRecord(record: IRecord) {
    const id = Key(record);
    const name = await getName(id);

    if (!(await es.indices.exists({ index: TABLE }))) {
        console.log("Creating missing index for table:", TABLE);

        const b = { mappings: {} };
        b.mappings[TABLE] = {
            properties: {
                suggest: {
                    type: 'completion',
                },
                username: {
                    type: 'text',
                },
                name: {
                    type: 'text',
                },
                profilePicRev: {
                    type: 'integer',
                },
            }
        }

        await es.indices.create({ index: TABLE, body: b });
        console.log("Index created");
    }

    const doc = unmarshalItem(record.dynamodb.NewImage);
    console.log("New document to index:", doc);

    const body = {
        suggest: {
            input: [doc.username, name],
            weight: 1
        },
        username: doc.username,
        name,
        profilePicRev: doc.profilePicRev
    };

    await es.index({
        index: TABLE,
        body,
        id,
        type: TABLE,
        refresh: "true"
    });

    console.log("Success - New Index ID", id);
}

async function removeRecord(record: IRecord) {
    const id = Key(record);

    if (await es.exists({ index: TABLE, type: TABLE, id })) {
        await es.delete({
            index: TABLE,
            id,
            type: TABLE,
            refresh: "true"
        });
    } else {
        console.log('Did not exist', id);
    }

    console.log("Deleted ID:", id);
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

async function modifyRecord(record: IRecord) {
    const doc = unmarshalItem(record.dynamodb.NewImage);
    console.log("Updated document:", doc);

    const id = Key(record);
    const name = await getName(id);

    console.log('name', name);

    const body = {
        suggest: {
            input: [doc.username, name],
            weight: 1
        },
        username: doc.username,
        name,
        profilePicRev: doc.profilePicRev
    };

    await es.index({
        index: TABLE,
        body,
        id,
        type: TABLE,
        refresh: "true"
    });

    console.log("Success - Updated Index ID", id);
}

function Key(record: IRecord) {
    return unmarshal(record.dynamodb.Keys.userId);
}
