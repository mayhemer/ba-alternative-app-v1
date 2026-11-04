import BackgroundTasks
import ExpoModulesCore
import Foundation

// ── Background refresh: the card's further switches without the app open ─────
//
// Asks iOS to wake the app at the card's next change. iOS decides when (often
// later, sometimes never: it weighs how often the app is used), so this only
// improves the card; the app open stays the reliable refresh. The work is all
// native: no JS runs. The identifier is in Info.plist
// (BGTaskSchedulerPermittedIdentifiers, plugins/withNowCard.js).

enum NowCardBackground {
  static let taskId = "cz.janbambas.ba.nowcard.refresh"

  static func register() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: taskId, using: nil) { task in
      guard let task = task as? BGAppRefreshTask else {
        task.setTaskCompleted(success: false)
        return
      }
      handle(task)
    }
  }

  static func schedule(after now: Date = Date()) {
    BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: taskId)
    guard let change = NowCardStore.load()?.nextChange(after: now) else {
      return
    }
    let request = BGAppRefreshTaskRequest(identifier: taskId)
    request.earliestBeginDate = change
    try? BGTaskScheduler.shared.submit(request)
  }

  private static func handle(_ task: BGAppRefreshTask) {
    let work = Task {
      await NowCardController.refresh(canStart: false)
      schedule()
      task.setTaskCompleted(success: true)
    }
    task.expirationHandler = {
      work.cancel()
    }
  }
}

public class NowCardAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Must be registered before launching ends, or iOS drops the task.
    NowCardBackground.register()
    return true
  }
}
