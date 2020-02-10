/**
 * Copyright (c) 2018-present, Bounz Media (Pty) Ltd
 * Created by Gerhard de Clercq
 */

import fetch from 'node-fetch';
import * as AWS from 'aws-sdk';

const ssm = new AWS.SSM();
const cognito = new AWS.CognitoIdentityServiceProvider();

export default async function RunAppSyncQuery(query: string, operationName: string, variables: any) {
	const UserPoolId = (await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise()).Parameter.Value;
	const ClientId = (await ssm.getParameter({ Name: 'ServerClientId-' + process.env.STAGE }).promise()).Parameter.Value;
	const GraphQlApiUrl = (await ssm.getParameter({ Name: 'GraphQlApiUrl-' + process.env.STAGE }).promise()).Parameter.Value;
	const CognitoSystemPassword = (await ssm.getParameter({ Name: 'CognitoSystemPassword-' + process.env.STAGE }).promise()).Parameter.Value;

	const params = {
		AuthFlow: 'ADMIN_NO_SRP_AUTH',
		ClientId,
		UserPoolId,
		AuthParameters: {
			USERNAME: 'System',
			PASSWORD: CognitoSystemPassword,
		},
	}
	const auth = await cognito.adminInitiateAuth(params).promise();
	const token = auth.AuthenticationResult.AccessToken;

	const postBody = {
		query,
		operationName,
		variables,
	};
	console.log(`Posting: ${JSON.stringify(postBody, null, 2)}`);

	const options = {
		method: 'POST',
		body: JSON.stringify(postBody),
		headers: {
			'Content-Type': 'application/json',
			'Authorization': token,
		},
	};

	const result = await (await fetch(GraphQlApiUrl, options)).json();
	if (result.errors && result.errors.length > 0) {
		// TODO: handle multiple errors
		const error = result.errors[0];
		if (error.errorType !== 'DynamoDB:ConditionalCheckFailedException') {
			throw error;
		} else {
			return 'ConditionalCheckFailed';
		}
	} else {
		return result.data;
	}
}