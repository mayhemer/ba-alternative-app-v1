// Table definitions for @shelf/jest-dynamodb (DynamoDB Local in integration tests).
// Source of truth: db-table-schema.js  (kept in sync with infra/lib/constructs/tables.ts)

const { TABLE_SCHEMA } = require('./db-table-schema');

/** @type {import('@shelf/jest-dynamodb').Config} */
module.exports = {
  // Strip the `keys` helper field — it's used by clearTables.ts but is not
  // part of the DynamoDB CreateTable API and would cause table creation to fail.
  // eslint-disable-next-line no-unused-vars
  tables: TABLE_SCHEMA.map(({ keys, ...table }) => table),
  // Use in-memory storage so every test run starts clean (no leftover files on disk).
  options: ['-inMemory'],
  // Sync globalSetup credentials with those used by db.ts and clearTables.ts.
  // Without this, DynamoDB Local (in-memory mode, no -sharedDb) silos each credentials
  // set into its own isolated store — tables created by globalSetup would be invisible
  // to test workers using different credentials.
  // Sync globalSetup's DynamoDB client with the region + credentials used by
  // db.ts and clearTables.ts. Without this, DynamoDB Local (in -inMemory mode)
  // isolates stores per (accessKeyId, region) pair — tables created by globalSetup
  // (which defaults to region 'local-env') would be invisible to test workers
  // using region 'local' with different credentials.
  clientConfig: {
    region: 'local',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  },
};
