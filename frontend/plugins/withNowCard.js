// ── The lock-screen now card: the app's Info.plist ────────────────────────────
//
// The Swift side (modules/now-card/ios) needs three keys in the main app:
// - NSSupportsLiveActivities: the app may start Live Activities;
// - UIBackgroundModes "fetch" and BGTaskSchedulerPermittedIdentifiers: the
//   background refresh that moves the card on without the app open.
// Android needs nothing here: the module's own AndroidManifest.xml is merged.
// The card's look is a separate target (targets/now-card, @bacons/apple-targets).

const { withInfoPlist } = require('expo/config-plugins');

const TASK_ID = 'cz.janbambas.ba.nowcard.refresh';

function addUnique(list, value) {
  const items = Array.isArray(list) ? list : [];
  return items.includes(value) ? items : [...items, value];
}

module.exports = function withNowCard(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.NSSupportsLiveActivities = true;
    cfg.modResults.UIBackgroundModes = addUnique(cfg.modResults.UIBackgroundModes, 'fetch');
    cfg.modResults.BGTaskSchedulerPermittedIdentifiers = addUnique(
      cfg.modResults.BGTaskSchedulerPermittedIdentifiers,
      TASK_ID,
    );
    return cfg;
  });
};
