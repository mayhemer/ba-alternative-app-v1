import { Platform, Settings } from 'react-native';

// ── Launch arguments ──────────────────────────────────────────────────────────
//
// What a test launched the app with: Maestro's `launchApp: arguments:` reaches
// an iOS app as `-key value` on its command line, which iOS puts in the app's
// user defaults for that launch only (nothing is stored), and React Native's
// Settings reads those. The E2E flows pass `e2eNow` (timeMode.ts) this way;
// only builds that enable it read it.
//
// iOS only for now: Android would need the launch intent's extras, and nothing
// runs E2E on Android yet.

/** The launch's value for `key`, or null when it has none (or on a platform without them). */
export function launchArgument(key: string): string | null {
  if (Platform.OS !== 'ios') {
    return null;
  }
  const value: unknown = Settings.get(key);
  return typeof value === 'string' ? value : null;
}
