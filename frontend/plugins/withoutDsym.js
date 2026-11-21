// ── No dSYM in iOS builds — all but store builds ──────────────────────────────
//
// Sets DEBUG_INFORMATION_FORMAT = dwarf on every build configuration of the Xcode
// project: the project level and every target (the app and the NowCard extension),
// Debug and Release. Xcode then skips dsymutil, which costs ~5 s on every Release
// build because the bundle phase rewrites the .app and the dSYM is regenerated.
// Nothing reads the dSYM locally: there is no crash reporter in the app.
//
// Applied by app.config.js unless the build profile sets BA_KEEP_DSYM=1, which
// only `production` does: its archive keeps the dSYM, so App Store Connect can
// symbolicate crash reports.
//
// A finalized mod, so it runs after @bacons/apple-targets, which writes the
// NowCard target's configurations (Release = dwarf-with-dsym) in its own mod after
// the standard Xcode project mod.
//
// Pods are left alone: they build as static libraries, which never get a dSYM.

const fs = require('fs');
const { withFinalizedMod, IOSConfig } = require('expo/config-plugins');

function setDwarfEverywhere(project) {
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const [key, entry] of Object.entries(configurations)) {
    if (key.endsWith('_comment') || !entry.buildSettings) {
      continue;
    }
    entry.buildSettings.DEBUG_INFORMATION_FORMAT = 'dwarf';
  }
  return project;
}

module.exports = function withoutDsym(config) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const project = IOSConfig.XcodeUtils.getPbxproj(cfg.modRequest.projectRoot);
      setDwarfEverywhere(project);
      fs.writeFileSync(project.filepath, project.writeSync());
      return cfg;
    },
  ]);
};

module.exports.setDwarfEverywhere = setDwarfEverywhere;
