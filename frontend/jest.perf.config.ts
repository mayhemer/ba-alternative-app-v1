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
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.ts',
    '<rootDir>/tests/setup/perf.setup.ts',
  ],
  testPathIgnorePatterns: ['<rootDir>/node_modules/'],
  // Generous on purpose. Each scenario repeats its subject to fill a ~20 ms
  // window and runs 30 times, so a scenario is already seconds long — and a real
  // regression multiplies that. At Jest's 5 s default a large slowdown makes the
  // test *time out* instead of being measured: the run goes red with no numbers,
  // and in CI, where this job is advisory, that failure is ignored entirely.
  // Verified by injecting a 12x regression, which timed out at the default and
  // is reported as a regression at this value.
  testTimeout: 120_000,
};

export default config;
