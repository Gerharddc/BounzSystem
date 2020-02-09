# BounzSystem
This is the backend code for the Bounz social media app for which the frontend code can be found at https://github.com/Gerharddc/BounzApp.

The backend makes extensive use of, especially serverless, AWS servies and makes use of the Serverless Framework to facilitate simpler management and deployment.

The backend has been designed around around serverless functions, DynamoDB and DynamoDB events in order be massively scalable although this comes at the cost of complexity. One feature, invites, is currently implemented using PostgreSQL on RDS and is not managed by the Serverless Framework yet.

This system is not currently being mantained and anyone willing to take on this task should get in contact.
