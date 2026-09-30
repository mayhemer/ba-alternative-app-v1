// ── API origin ────────────────────────────────────────────────────────────────
//
// One definition for all three adapters, which each used to carry their own
// copy of the literal.
//
// Overridable so the app can be pointed at the local fixture server for E2E
// testing: Maestro drives a real installed build and cannot intercept network
// the way Playwright or MSW can, so redirecting has to happen inside the app.
//
//   EXPO_PUBLIC_API_ORIGIN=http://10.0.2.2:4010 npx expo start   # Android emulator
//   EXPO_PUBLIC_API_ORIGIN=http://localhost:4010 npx expo start  # iOS simulator / web
//
// `EXPO_PUBLIC_*` is inlined at build time by Expo's Babel plugin, so it must be
// written as this exact static member expression — destructuring `process.env`
// or building the key dynamically defeats the substitution and yields undefined.
// It is not a secret: it ships visible in the bundle, which is fine for an origin.
//
// Unset — the normal case, and every production build — falls back to the real API.

const DEFAULT_API_ORIGIN = 'https://api.ba.janbambas.cz';

export const API_ORIGIN: string =
  process.env.EXPO_PUBLIC_API_ORIGIN ?? DEFAULT_API_ORIGIN;
