// Wipes all items from every table before each test, replicating jest-dynalite's
// clearAfterEach behaviour. Tables themselves are kept (created once by DynamoDB Local
// globalSetup); only rows are removed so each test starts with a clean slate.
//
// IMPORTANT: MOCK_DYNAMODB_ENDPOINT must be set before db.ts is imported, because
// db.ts creates its DynamoDB client at module level. setupFilesAfterEnv files are
// evaluated before the test file's imports are resolved, so setting the env var here
// is sufficient. (@shelf/jest-dynamodb's environment.js does not set this for us.)
process.env.MOCK_DYNAMODB_ENDPOINT ??= 'http://localhost:8000';

import {
  DynamoDBClient,
  ScanCommand,
  BatchWriteItemCommand,
} from '@aws-sdk/client-dynamodb';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { TABLE_SCHEMA } = require('../../db-table-schema') as {
  TABLE_SCHEMA: Array<{ TableName: string; keys: string[] }>;
};

beforeEach(async () => {
  const endpoint = process.env.MOCK_DYNAMODB_ENDPOINT;
  if (!endpoint) { return; }

  const client = new DynamoDBClient({
    endpoint,
    region: 'local',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });

  try {
    for (const table of TABLE_SCHEMA) {
      const { Items: items = [] } = await client.send(
        new ScanCommand({ TableName: table.TableName }),
      );
      if (items.length === 0) { continue; }

      const CHUNK = 25; // DynamoDB BatchWrite limit
      for (let i = 0; i < items.length; i += CHUNK) {
        await client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [table.TableName]: items.slice(i, i + CHUNK).map(item => ({
                DeleteRequest: {
                  Key: Object.fromEntries(table.keys.map(k => [k, item[k]])),
                },
              })),
            },
          }),
        );
      }
    }
  } finally {
    client.destroy();
  }
});
