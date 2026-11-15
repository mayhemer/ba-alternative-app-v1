import { profileEnv } from './easProfile.ts';

// ── A build profile's env, as EAS would set it ────────────────────────────────
//
// Dimensions: the profile (with env, without, extending one, extending a chain,
// unknown); a value set both by a profile and by the one it extends.

const EAS = {
  build: {
    preview: { env: { EXPO_PUBLIC_TIME_MODE: 'live-simulation' } },
    production: {},
    perf: { extends: 'preview', env: { EXPO_PUBLIC_TIME_MODE: 'native', EXPO_PUBLIC_PERF_MARKS: '1' } },
    'preview-perfinst': { extends: 'preview', env: { EXPO_PUBLIC_PERF_MARKS: '1' } },
    'perf-quiet': { extends: 'perf', env: { EXPO_PUBLIC_PERF_MARKS: '0' } },
  },
};

it('reads a profile\'s env', () => {
  expect(profileEnv(EAS, 'preview')).toEqual({ EXPO_PUBLIC_TIME_MODE: 'live-simulation' });
});

it('reads a profile without env as none', () => {
  expect(profileEnv(EAS, 'production')).toEqual({});
});

it('adds what the profile extends', () => {
  expect(profileEnv(EAS, 'preview-perfinst')).toEqual({ EXPO_PUBLIC_TIME_MODE: 'live-simulation', EXPO_PUBLIC_PERF_MARKS: '1' });
});

it('lets the profile\'s own value win over the one it extends, down a chain', () => {
  expect(profileEnv(EAS, 'perf-quiet')).toEqual({ EXPO_PUBLIC_TIME_MODE: 'native', EXPO_PUBLIC_PERF_MARKS: '0' });
});

it('fails on a profile eas.json does not have, naming it', () => {
  expect(() => profileEnv(EAS, 'previw')).toThrow('previw');
});
