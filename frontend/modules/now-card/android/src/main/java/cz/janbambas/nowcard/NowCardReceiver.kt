package cz.janbambas.nowcard

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Redraws the card at its alarms, after a reboot, an app update, or a clock or
// time-zone change (the countdowns are set against the time since boot, so a
// moved clock needs them set again); and hides it when the user swipes it away.

class NowCardReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      ACTION_DISMISSED -> NowCardScheduler.dismiss(context)
      else -> NowCardScheduler.refresh(context)
    }
  }

  companion object {
    const val ACTION_TICK = "cz.janbambas.nowcard.TICK"
    const val ACTION_DISMISSED = "cz.janbambas.nowcard.DISMISSED"
  }
}
