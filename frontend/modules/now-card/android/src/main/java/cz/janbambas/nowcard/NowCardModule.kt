package cz.janbambas.nowcard

import android.Manifest
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationManagerCompat
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// ── The lock-screen now card: Android module ──────────────────────────────────
//
// JS side: modules/now-card/index.ts. setScript stores the script and redraws
// the card; everything after that runs without JS (alarms, NowCardReceiver).

class NowCardModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "No React context" }

  override fun definition() = ModuleDefinition {
    Name("NowCard")

    AsyncFunction("setScript") { json: String ->
      NowCardStore(context).scriptJson = json
      NowCardScheduler.refresh(context)
    }

    AsyncFunction("stop") {
      NowCardStore(context).clear()
      NowCardScheduler.refresh(context)
    }

    AsyncFunction("getPermission") { promise: Promise ->
      permission(ask = false, promise)
    }

    AsyncFunction("requestPermission") { promise: Promise ->
      permission(ask = true, promise)
    }

    AsyncFunction("isEnabled") {
      NowCardStore(context).enabled
    }

    AsyncFunction("setEnabled") { enabled: Boolean ->
      NowCardStore(context).enabled = enabled
      NowCardScheduler.refresh(context)
    }
  }

  /** "granted", "denied" or "undetermined" (not asked yet), for POST_NOTIFICATIONS. */
  private fun permission(ask: Boolean, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
      // No runtime permission before Android 13: only the app's notification switch.
      promise.resolve(if (NotificationManagerCompat.from(context).areNotificationsEnabled()) "granted" else "denied")
      return
    }
    val permissions = appContext.permissions
    if (permissions == null) {
      promise.resolve("denied")
      return
    }
    val answer = { result: Map<String, expo.modules.interfaces.permissions.PermissionsResponse> ->
      val status = result[Manifest.permission.POST_NOTIFICATIONS]?.status ?: PermissionsStatus.DENIED
      if (status == PermissionsStatus.GRANTED) {
        // Granted just now: draw the card without waiting for the next switch.
        NowCardScheduler.refresh(context)
      }
      promise.resolve(status.status)
    }
    if (ask) {
      permissions.askForPermissions({ answer(it) }, Manifest.permission.POST_NOTIFICATIONS)
    } else {
      permissions.getPermissions({ answer(it) }, Manifest.permission.POST_NOTIFICATIONS)
    }
  }
}
