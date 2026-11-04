package cz.janbambas.nowcard

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationManagerCompat

// ── Making the card match "now" ───────────────────────────────────────────────
//
// refresh() posts, redraws or removes the notification for the span holding
// now, and arms one alarm for the next change. Called by the app (each new
// script, each return to the front), by that alarm, after a reboot, an app
// update or a clock or time-zone change. The countdowns tick on their own
// (Chronometer); only these switches wake the app, a few dozen times a day.

object NowCardScheduler {
  fun refresh(context: Context) {
    val store = NowCardStore(context)
    val script = store.script
    val now = System.currentTimeMillis()
    if (script == null || !store.enabled) {
      NowCardNotification.cancel(context)
      cancelAlarm(context)
      return
    }
    val span = script.spanAt(now)
    val hidden = now < store.dismissedUntil
    if (span == null || hidden || !NotificationManagerCompat.from(context).areNotificationsEnabled()) {
      NowCardNotification.cancel(context)
    } else {
      NowCardNotification.post(context, script, span)
    }
    val next = script.nextChange(now)
    if (next == null) {
      cancelAlarm(context)
    } else {
      armAlarm(context, next)
    }
  }

  /** The user swiped the card away: keep it hidden until that day's card would end. */
  fun dismiss(context: Context) {
    val store = NowCardStore(context)
    val now = System.currentTimeMillis()
    store.dismissedUntil = store.script?.windowEnd(now) ?: now
    refresh(context)
  }

  private fun alarmIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    0,
    Intent(context, NowCardReceiver::class.java).setAction(NowCardReceiver.ACTION_TICK),
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
  )

  private fun armAlarm(context: Context, at: Long) {
    val alarms = context.getSystemService(AlarmManager::class.java) ?: return
    val intent = alarmIntent(context)
    val exact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarms.canScheduleExactAlarms()
    if (exact) {
      alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
    } else {
      alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent)
    }
  }

  private fun cancelAlarm(context: Context) {
    context.getSystemService(AlarmManager::class.java)?.cancel(alarmIntent(context))
  }
}
