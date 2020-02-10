import { Context } from "aws-lambda";
import { unmarshal, unmarshalItem } from "dynamodb-marshaler";
import * as elasticsearch from "elasticsearch";

const es = new elasticsearch.Client({
  hosts: [
    process.env.ELASTICSEARCH_URL
  ],
  connectionClass: require("http-aws-es"),
  apiVersion: "6.3"
});

const TABLE = "courtinfo";

export async function handler(event: any, context: Context) {
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
      courtId: { S: string };
    };
    NewImage: object;
  };
}

async function insertRecord(record: IRecord) {
  if (!(await es.indices.exists({ index: TABLE }))) {
    console.log("Creating missing index for table:", TABLE);

    const b = { mappings: {}};
    b.mappings[TABLE] = {
      properties: {
        name: {
          type: 'completion',
        },
      }
    }

    await es.indices.create({ index: TABLE, body: b });
    console.log("Index created");
  }

  const doc = unmarshalItem(record.dynamodb.NewImage);
  console.log("New document to index:", doc);

  const body = {
    name: doc.name
  };

  const id = Key(record);
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

async function modifyRecord(record: IRecord) {
  const doc = unmarshalItem(record.dynamodb.NewImage);
  console.log("Updated document:", doc);

  const body = {
    name: doc.name
  };

  const id = Key(record);
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
  return unmarshal(record.dynamodb.Keys.courtId);
}
