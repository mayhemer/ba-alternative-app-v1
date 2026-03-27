import type { Config } from 'jest';

// Integration tests run against an in-memory DynamoDB (dynalite).
// Kept separate from jest.config.ts so the unit/layer-2 test run stays fast
// and doesn't spin up the database.
const config: Config = {
  // TypeScript transform (same as unit tests)
  transform: { '^.+\\.ts$': ['ts-jest', {}] },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^../../shared/(.*)$': '<rootDir>/shared/$1',
  },
  rootDir: '.',

  // Only pick up integration tests
  testMatch: ['**/tests/integration/**/*.test.ts'],

  // jest-dynalite environment: starts dynalite per-worker, creates tables
  // before each file, clears rows after each test
  testEnvironment: 'jest-dynalite/environment',
  setupFilesAfterEnv: [
    'jest-dynalite/setupTables',
    'jest-dynalite/clearAfterEach',
  ],

  // DynamoDB operations can be slow to start; give each test more headroom
  testTimeout: 15000,
};

export default config;
