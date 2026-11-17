// Single source of truth for DynamoDB table definitions used in integration tests.
//
// ⚠ Keep in sync with app/infra/lib/constructs/tables.ts
//   • TableName  ↔ tableName
//   • partitionKey/sortKey names ↔ KeySchema AttributeNames
//
// Used by:
//   - jest-dynamodb-config.js  (table creation in DynamoDB Local)
//   - tests/integration/clearTables.ts  (beforeEach table wipe)

/** @type {Array<{ TableName: string, keys: string[] }>} */
const TABLE_SCHEMA = [
  {
    TableName: 'ba-artists',
    keys: ['slug', 'artistId'],
    KeySchema: [
      { AttributeName: 'slug',     KeyType: 'HASH'  },
      { AttributeName: 'artistId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'slug',     AttributeType: 'S' },
      { AttributeName: 'artistId', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: 'ba-stages',
    keys: ['slug', 'stageId'],
    KeySchema: [
      { AttributeName: 'slug',    KeyType: 'HASH'  },
      { AttributeName: 'stageId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'slug',    AttributeType: 'S' },
      { AttributeName: 'stageId', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: 'ba-categories',
    keys: ['slug', 'categoryId'],
    KeySchema: [
      { AttributeName: 'slug',       KeyType: 'HASH'  },
      { AttributeName: 'categoryId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'slug',       AttributeType: 'S' },
      { AttributeName: 'categoryId', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: 'ba-events',
    keys: ['slug', 'eventId'],
    KeySchema: [
      { AttributeName: 'slug',    KeyType: 'HASH'  },
      { AttributeName: 'eventId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'slug',    AttributeType: 'S' },
      { AttributeName: 'eventId', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: 'ba-user-notes',
    keys: ['userId', 'slugArtistId'],
    KeySchema: [
      { AttributeName: 'userId',       KeyType: 'HASH'  },
      { AttributeName: 'slugArtistId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId',       AttributeType: 'S' },
      { AttributeName: 'slugArtistId', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
  {
    TableName: 'ba-sync-state',
    keys: ['slug', 'tableName'],
    KeySchema: [
      { AttributeName: 'slug',      KeyType: 'HASH'  },
      { AttributeName: 'tableName', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'slug',      AttributeType: 'S' },
      { AttributeName: 'tableName', AttributeType: 'S' },
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 1, WriteCapacityUnits: 1 },
  },
];

module.exports = { TABLE_SCHEMA };
