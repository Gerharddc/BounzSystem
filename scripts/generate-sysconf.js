const AWS = require('aws-sdk');
const fs = require('fs');

const REGION = process.env.REGION || 'us-east-1';
const STAGE = process.env.STAGE || 'dev';

AWS.config.region = REGION;

const cfn = new AWS.CloudFormation();
const ssm = new AWS.SSM();

async function getExports(NextToken) {
    const data = await cfn.listExports({ NextToken }).promise();
    if (data.NextToken) {
        return data.Exports.concat(await getExports(data.NextToken));
    } else {
        return data.Exports;
    }
}

function toJS(obj) {
    let file = 'const system = {\n';

    for (const prop in obj) {
        if (obj.hasOwnProperty(prop)) {
            file += '    ' + prop + ': \'' + obj[prop] + '\',\n';
        }
    }

    file += '};\n\nexport default system;\n';

    return file;
}

async function writeConf() {
    console.log('getting exports');
    const arr = await getExports();
    const map = new Map();

    for (const e of arr) {
        map.set(e.Name, e.Value);
    }
    console.log('got exports');

    console.log('getting ssm');
    const UserPoolId = (await ssm.getParameter({ Name: 'PublicUserPoolId-' + STAGE }).promise()).Parameter.Value;
    const IdentityPoolId = (await ssm.getParameter({ Name: 'PublicIdentityPoolId-' + STAGE }).promise()).Parameter.Value;
	const ClientId = (await ssm.getParameter({ Name: 'WebClientId-' + STAGE }).promise()).Parameter.Value;
    const GraphQlApiUrl = (await ssm.getParameter({ Name: 'GraphQlApiUrl-' + STAGE }).promise()).Parameter.Value;
    const PinpointAppId = (await ssm.getParameter({ Name: 'PinpointAppId-' + STAGE }).promise()).Parameter.Value;
    const MinApi = (await ssm.getParameter({ Name: 'MinApi-' + STAGE }).promise()).Parameter.Value;
    console.log('got ssm');

    console.log('writing file')
    fs.writeFileSync('generated/system-exports.ts', toJS({
        aws_project_region: REGION,
        public_images_domain: map.get('PublicImagesDomain-' + STAGE),
        aws_mobile_analytics_app_id: PinpointAppId,
        aws_appsync_graphqlEndpoint: GraphQlApiUrl,
        public_uploads_bucket: map.get('PublicUploadsS3BucketName-' + STAGE),
        compute_rest_endpoint: `https://${map.get('ComputeRESTEndpoint-' + STAGE)}.execute-api.${REGION}.amazonaws.com/${STAGE}`,
        misc_files_bucket: map.get('MiscFilesS3BucketName-' + STAGE),
        aws_cognito_identity_pool_id: IdentityPoolId,
        aws_user_pools_id: UserPoolId,
        aws_user_pools_web_client_id: ClientId,
        stage: STAGE,
        min_api: MinApi,
    }));
    console.log('done');
}

writeConf();