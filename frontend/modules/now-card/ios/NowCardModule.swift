import ActivityKit
import ExpoModulesCore

// ── The lock-screen now card: iOS module ──────────────────────────────────────
//
// JS side: modules/now-card/index.ts. The app calls setScript on every change
// of the script and every time it comes to the front; each call is a refresh,
// which is how the card catches up after it froze.

public class NowCardModule: Module {
  public func definition() -> ModuleDefinition {
    Name("NowCard")

    AsyncFunction("setScript") { (json: String) in
      NowCardStore.save(json)
      await NowCardController.refresh(canStart: true)
      NowCardBackground.schedule()
    }

    AsyncFunction("stop") {
      NowCardStore.clear()
      await NowCardController.endAll()
    }

    // iOS needs no permission prompt: Live Activities have their own switch in
    // the app's settings, on by default.
    AsyncFunction("getPermission") { () -> String in
      ActivityAuthorizationInfo().areActivitiesEnabled ? "granted" : "denied"
    }

    AsyncFunction("requestPermission") { () -> String in
      ActivityAuthorizationInfo().areActivitiesEnabled ? "granted" : "denied"
    }

    AsyncFunction("isEnabled") { () -> Bool in
      true
    }

    AsyncFunction("setEnabled") { (_: Bool) in
    }
  }
}
