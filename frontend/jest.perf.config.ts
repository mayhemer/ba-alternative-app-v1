import type { Config } from 'jest';

// ── Performance suite ─────────────────────────────────────────────────────────
//
// Separate from jest.config.ts because Reassure runs every scenario many times
// over to get a usable distribution — minutes, not the seconds the normal suite
// takes, so it has no place in the fast feedback loop.
//
// One platform preset only. Reassure compares a baseline run against a current
// one; comparing across presets would just measure the presets. What this gates
// is render counts and JS durations in Node — emphatically NOT device
// performance, which needs Hermes and real view creation. See ARCHITECTURE.md.

const config: Config = {
  preset: 'jest-expo/ios',
  rootDir: '.',
  testMatch: ['<rootDir>/src/**/*.perf-test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
};

export default config;
