// Table definitions used by jest-dynalite for integration tests.
// Schema must match the CDK table definitions in infra/lib/constructs/tables.ts.

/** @type {import('jest-dynalite').Config} */
module.exports = {
  tables: [
    {
      TableName: 'ba-artists',
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
      TableName: 'ba-sync-state',
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
  ],
};
