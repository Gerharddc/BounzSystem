const lineByLine = require('line-by-line');
const fs = require('fs');
const apiGenerator = require('aws-appsync-codegen');
const graphqlGenerator = require('amplify-graphql-docs-generator').default;
const path = require('path');

const OUT_DIR = 'generated';

function splitFiles(input, out) {
    return new Promise((resolve, reject) => {
        const lr = new lineByLine(input);

        let curType, curText, curName;

        const top =
            `// tslint:disable
// this is an auto generated file. This will be overwritten

`;

        const file = {
            query: new String(top),
            subscription: new String(top),
            mutation: new String(top),
        };

        function processCurrent() {
            file[curType] += 'export const ' + curName + ' = `' + curText + '`;\n';
        }

        function checkStart(type, line) {
            if (line.startsWith(type)) {
                processCurrent();
                curType = type;
                curText = line + '\n';
                curName = line.replace(type + ' ', '').split('(')[0];
                curName = curName.charAt(0).toLowerCase() + curName.slice(1);

                return true;
            }

            return false;
        }

        lr.on('line', function (line) {
            if (checkStart('query', line)) {
            } else if (checkStart('mutation', line)) {
            } else if (checkStart('subscription', line)) {
            } else {
                curText += line + '\n';
            }
        });

        lr.on('end', function () {
            processCurrent();
            fs.writeFileSync(out + '/queries.ts', file['query']);
            fs.writeFileSync(out + '/mutations.ts', file['mutation']);
            fs.writeFileSync(out + '/subscriptions.ts', file['subscription']);
            console.log('Done splitting');
            resolve();
        });
    });
}

function wait() {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, 1000);
    })
}

async function generate() {
    if (!fs.existsSync(OUT_DIR)) {
        fs.mkdirSync(OUT_DIR);
    }

    const gqlDir = OUT_DIR + '/graphql';

    if (!fs.existsSync(gqlDir)) {
        fs.mkdirSync(gqlDir);
    }

    apiGenerator.introspectSchema('services/api/schema.graphql', gqlDir + '/schema.json');
    while (!fs.existsSync(gqlDir + '/schema.json')) {
        await wait();
    }

    graphqlGenerator(gqlDir + '/schema.json', gqlDir + '/operations.graphql', { language: 'graphql' });
    apiGenerator.generate([gqlDir + '/operations.graphql'], path.resolve(gqlDir + '/schema.json'), gqlDir + '/API.ts', '', 'ts');
    await splitFiles(gqlDir + '/operations.graphql', gqlDir);

    console.log('done');
}

generate();