'use strict';
const AWS = require('aws-sdk');

const stepfunctions = new AWS.StepFunctions();
const s3 = new AWS.S3();

exports.start = async (event) => {
  const stateMachineArn = process.env.statemachine_arn;
  const params = {
    stateMachineArn,
    input: JSON.stringify(event),
  };

  await stepfunctions.startExecution(params).promise();
  return `Your statemachine ${stateMachineArn} executed successfully`;
};

exports.delete = async (event) => {
  console.log('event', event);

  for (const record of event.Records) {
    if (record.eventName !== 'ObjectCreated:Put') {
      console.log('Skipping non-put record', record);
      continue;
    }

    console.log('s3', JSON.stringify(record.s3));

    const params = {
      Bucket: record.s3.bucket.name,
      Key: record.s3.object.key,
    }
    await s3.deleteObject(params).promise();

    return 'Deleted ' + record.s3.arn;
  }
};

