module.exports = {
    //'AWS::AppSync::ApiKey': { destination: 'AppSync', allowSuffix: true },
    'AWS::AppSync::DataSource': { destination: 'DataSources', allowSuffix: true },
    //'AWS::AppSync::GraphQLApi': { destination: 'AppSync', allowSuffix: true },
    //'AWS::AppSync::GraphQLSchema': { destination: 'AppSync', allowSuffix: true },
    'AWS::AppSync::Resolver': { destination: 'Resolvers', allowSuffix: true },
    'AWS::IAM::Role': { destination: 'Roles', allowSuffix: true },
}