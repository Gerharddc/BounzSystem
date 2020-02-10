const AWS = require('aws-sdk');
AWS.config.region = 'us-east-1';

const cognito = new AWS.CognitoIdentityServiceProvider();
const ssm = new AWS.SSM();

const SYSTEM_USERNAME = 'System';
const PASSWORD = 'Password1!';

let UserPoolId, ClientId;

async function run() {
    UserPoolId = (await ssm.getParameter({ Name: 'PublicUserPoolId-' + process.env.STAGE }).promise()).Parameter.Value;
    ClientId = (await ssm.getParameter({ Name: 'ServerClientId-' + process.env.STAGE }).promise()).Parameter.Value;

    await CreateUser();
    const session = await LoginUser();
    await ChangePassword(session);
}

async function CreateUser() {
    console.log('Creating user');

    const params = {
        UserPoolId,
        Username: SYSTEM_USERNAME,
        TemporaryPassword: PASSWORD,
        UserAttributes: [
            {
                Name: 'name',
                Value: 'Bounz',
            },
            {
                Name: 'family_name',
                Value: 'Server',
            },
            {
                Name: 'gender',
                Value: 'other',
            },
            {
                Name: 'email',
                Value: 'server@bounz.io',
            },
        ]
    }

    const result = await cognito.adminCreateUser(params).promise();
    console.log('result', result);
}

async function LoginUser() {
    console.log('Logging in user');

    const params = {
        AuthFlow: 'ADMIN_NO_SRP_AUTH',
        ClientId,
        UserPoolId,
        AuthParameters: {
            USERNAME: SYSTEM_USERNAME,
            PASSWORD: PASSWORD,
        }   
    }

    const result = await cognito.adminInitiateAuth(params).promise();
    console.log('result', result);

    return result.Session;
}

async function ChangePassword(Session) {
    console.log('Changing password');

    const params = {
        ChallengeName: 'NEW_PASSWORD_REQUIRED',
        ClientId,
        UserPoolId,
        ChallengeResponses: {
            USERNAME: SYSTEM_USERNAME,
            NEW_PASSWORD: PASSWORD,
        },
        Session,
    }

    const result = await cognito.adminRespondToAuthChallenge(params).promise();
    console.log('result', result);
}

run();