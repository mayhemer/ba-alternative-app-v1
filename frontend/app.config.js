// ── Dynamic config on top of app.json ─────────────────────────────────────────
//
// app.json stays the source of truth; this only adds what depends on the build
// profile. Values come from the profile's `env` in eas.json — a variable set in
// your local shell is not uploaded with the project and never reaches an EAS
// cloud build.

module.exports = ({ config }) => {
  const plugins = [...(config.plugins ?? [])];

  // Test builds talk to the fixture server over plain HTTP. See the plugin.
  if (process.env.BA_ALLOW_CLEARTEXT === '1') {
    plugins.push('./plugins/withCleartextTraffic');
  }

  return { ...config, plugins };
};
