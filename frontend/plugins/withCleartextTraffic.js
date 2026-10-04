// ── Allow plain HTTP — test builds only ───────────────────────────────────────
//
// Release builds targeting API 28+ refuse cleartext HTTP, and the Expo template
// only lifts that in the *debug* manifest. The perf build talks to the local
// fixture server (http://localhost:4010, reached over USB via `adb reverse`), so
// without this every request it makes is refused.
//
// Applied by app.config.js only when the build profile sets BA_ALLOW_CLEARTEXT=1.
// Production and preview builds never get it.
//
// A local plugin rather than expo-build-properties: it is ten lines, and one
// fewer Expo-versioned dependency to re-pin at every SDK upgrade.

const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    application.$['android:usesCleartextTraffic'] = 'true';
    return cfg;
  });
};
