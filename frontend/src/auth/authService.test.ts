import * as AuthSession from 'expo-auth-session';
import { tryRestoreSession } from './authService';
import { loadTokens, type StoredTokens } from './tokenStorage';
import { setClockShift } from '../utils/clock';

// ── A session's expiry is real time ───────────────────────────────────────────
//
// A time mode (live simulation, controlled E2E time) moves the app's clock;
// a token's expiry is Cognito's, on the real one. Dimensions: the app showing a year
// later than real time, against a token valid in real time for another hour.

jest.mock('expo-auth-session', () => ({
  refreshAsync: jest.fn(),
}));

jest.mock('./tokenStorage', () => ({
  loadTokens: jest.fn(),
  saveTokens: jest.fn(async () => undefined),
}));

const REAL = Date.parse('2026-11-11T14:10:00+01:00');
const YEAR = 365 * 24 * 60 * 60 * 1000;

const TOKENS: StoredTokens = {
  accessToken: 'access',
  idToken: 'id',
  refreshToken: 'refresh',
  expiresAt: REAL + 60 * 60 * 1000,
  userId: 'u1',
  email: 'u1@example.com',
  name: 'U One',
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(REAL);
  (loadTokens as jest.Mock).mockResolvedValue(TOKENS);
});

afterEach(() => {
  setClockShift(null);
  jest.useRealTimers();
});

it('keeps a session valid in real time when the app shows a year later, without refreshing it', async () => {
  setClockShift((realMs) => realMs + YEAR);
  expect(await tryRestoreSession()).toEqual(TOKENS);
  expect(AuthSession.refreshAsync).not.toHaveBeenCalled();
});
