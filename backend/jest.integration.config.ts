import type { Config } from 'jest';
import { resolve } from 'path';

// Integration tests run against an in-memory DynamoDB (DynamoDB Local via @shelf/jest-dynamodb).
// Kept separate from jest.config.ts so the unit/layer-2 test run stays fast
// and doesn't spin up the database.
//
// Note: @shelf/jest-dynamodb's `preset` key is not reliably processed from a TypeScript
// Jest config file, so we expand it manually here (same three keys the preset provides).
const shelfJestDynamodb = resolve(__dirname, 'node_modules/@shelf/jest-dynamodb/lib');

const config: Config = {
  // Expand @shelf/jest-dynamodb preset manually (equivalent to `preset: '@shelf/jest-dynamodb'`)
  globalSetup:    `${shelfJestDynamodb}/setup.js`,
  globalTeardown: `${shelfJestDynamodb}/teardown.js`,
  testEnvironment:`${shelfJestDynamodb}/environment.js`,

  // TypeScript transform (same as unit tests)
  transform: { '^.+\\.ts$': ['ts-jest', {}] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^../../shared/(.*)$': '<rootDir>/shared/$1',
  },
  rootDir: '.',

  // Only pick up integration tests
  testMatch: ['**/tests/integration/**/*.test.ts'],

  // clearTables sets MOCK_DYNAMODB_ENDPOINT and wipes all rows before each test
  setupFilesAfterEnv: ['<rootDir>/tests/integration/clearTables.ts'],

  // DynamoDB operations can be slow to start; give each test more headroom
  testTimeout: 15000,
};

export default config;
