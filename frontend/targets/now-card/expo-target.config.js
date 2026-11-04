// ── The lock-screen now card: its Live Activity's look ────────────────────────
//
// A widget extension (@bacons/apple-targets) that only draws the Live Activity
// the app starts (modules/now-card/ios). Its Xcode target is "NowCard", bundle
// cz.janbambas.ba.nowcard: signing needs its own App ID and ad-hoc profile
// (docs/frontend/build/credentials.md).

/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'NowCard',
  displayName: 'Now card',
  bundleIdentifier: '.nowcard',
  // The app's own floor (Expo SDK 58); Live Activities need 16.2.
  deploymentTarget: '16.4',
  frameworks: ['SwiftUI', 'WidgetKit', 'ActivityKit'],
};
