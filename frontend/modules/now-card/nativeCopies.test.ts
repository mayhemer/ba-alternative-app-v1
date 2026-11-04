import { readFileSync } from 'fs';
import { join } from 'path';

// ── The Live Activity's state type exists twice, and must not drift ───────────
//
// The app (modules/now-card/ios) starts and updates the activity; the widget
// extension (targets/now-card) draws it. ActivityKit hands the state between
// the two by this type, so both copies must be the same file.

it('keeps the two NowCardAttributes.swift copies identical', () => {
  const app = readFileSync(join(__dirname, 'ios', 'NowCardAttributes.swift'), 'utf8');
  const extension = readFileSync(join(__dirname, '..', '..', 'targets', 'now-card', 'NowCardAttributes.swift'), 'utf8');
  expect(extension).toBe(app);
});
