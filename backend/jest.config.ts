import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // Resolve imports relative to backend/ root
  moduleNameMapper: {
    '^../../shared/(.*)$': '<rootDir>/shared/$1',
  },
};

export default config;
