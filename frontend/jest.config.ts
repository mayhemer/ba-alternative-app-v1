import type { Config } from 'jest';

// ── Frontend unit / integration suite ─────────────────────────────────────────
//
// Standalone config file rather than a package.json "jest" block, matching the
// backend. Tests are co-located with the module they cover (`<module>.test.ts`),
// so `tests/` holds only fixtures, setup and the E2E fixture server.
//
// The whole suite runs three times, once per platform preset. That is the only
// cheap cover for the Platform.OS divergence in this app — token storage
// (localStorage vs SecureStore), the back-history web/native split, and the two
// sheets' entirely separate web implementations — and it needs no device. Each
// preset sets Platform.OS and supplies the matching environment: the web one
// runs under jsdom, so `localStorage` is real there and absent elsewhere.
//
// The performance suite has its own config (jest.perf.config.ts): Reassure runs
// each scenario many times over, which does not belong in the fast feedback loop.

const shared = {
  rootDir: '.',
  // e2e/ is Playwright and Maestro; tests/ is fixtures and helpers, not cases.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/e2e/',
    '<rootDir>/tests/',
    '\\.perf-test\\.[jt]sx?$',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  clearMocks: true,
};

// Component tests (`.test.tsx`) render through @testing-library/react-native,
// which builds a React *Native* element tree. Under the web preset those
// components come out as react-native-web DOM, which that renderer cannot host —
// a <Text> lands inside a <div> and it throws. So rendering is verified on the
// native presets, and web rendering is Playwright's job, against a real browser
// where it means something. Logic tests (`.test.ts`) run everywhere.
const WEB_ONLY_IGNORES = ['\\.test\\.tsx$'];

const config: Config = {
  projects: (['ios', 'android', 'web'] as const).map((platform) => ({
    ...shared,
    displayName: platform,
    preset: `jest-expo/${platform}`,
    testPathIgnorePatterns: [
      ...shared.testPathIgnorePatterns,
      ...(platform === 'web' ? WEB_ONLY_IGNORES : []),
    ],
  })),
};

export default config;
