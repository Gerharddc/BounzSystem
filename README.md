# Bounz (Backend)
This is the backend code for the Bounz social media app for which the frontend code can be found at https://github.com/Gerharddc/BounzApp. Please check out that repository for more information on the app.

The backend makes extensive use of, especially serverless, AWS services and makes use of the Serverless Framework to facilitate simpler management and deployment.

The backend has been designed around serverless functions, DynamoDB and DynamoDB events in order be massively scalable although this comes at the cost of complexity. One feature, invites, is currently implemented using PostgreSQL on RDS and is not managed by the Serverless Framework yet.

This system is not currently being mantained and anyone willing to take on this task should get in contact.

This repository contains Serverless stack definitions, Lambda function source code and a few helper scripts that can all be used to instantiate
an instance of the Bounz system on AWS. In order to be able to deploy the stacks you will need to have the AWS CLI installed and configured with
access to your AWS account.

During a new installation, certain services need to be deployed before others and groups can be deployed in the following order:
1. db, storage, auth, image-layer, search
2. compute, triggers
3. api

The sharedCode folder contains code that can be referenced by the Lambda functions of both the "compute" and "triggers" stacks. The folder is
symlinked into both stacks into a local "shared" directory.

The scripts folder contains a script that generates GraphQL documents from the schema.graphql file in the api service as well as a script that
generates a file with all the necessary identifiers of a deployed service. The graphql script can be run at any time to update the graphql files
and it is in fact run automatically after a yarn install so that the definitions are available to Lambda functions. To achieve this the graphql
output folder has been symlinked into the sharedCode folder.

The script to generate system outputs can only be run after a full system deploy and the following resources have to have been manually created
in the current AWS account as well:
1. A PinPoint instance that has been configured with the proper GCM and APNS keys
2. A group named "System" and one named "Admin" must be added to the deployed Cognito User Pool
3. A user with the Cognito username "System" belonging to the group "System" has to be manually created in the pool
4. The System user should be given a password and it should be stored in SSM as CognitoSystemPassword-$stage
5. A Cognito user with the username "ghost" has to be created and then logged into the app to create a UserInfo for it
6. The PinPoint application id should be stored in SSM as PinpointAppId-$stage
7. The Cognito User Pool needs to be manually configured for email verification
8. The bounz.io needs to be manually added to SES
