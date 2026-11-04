package cz.janbambas.nowcard

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

// ── The card as an ongoing notification ───────────────────────────────────────
//
// Spec: docs/frontend/design/lock-screen.md. Rows are My plan's two lines:
//   live   NAME ……………… ● LIVE −48:00 [⚠]   break  −1:30:12 › NAME
//          19:00–20:00 …… Stage                    19:00–20:00 …… Stage
//   ─────────────────────────────────── (expanded only)
//   clash  −28:00 › NAME ………… ⚠ +1
//          19:40–20:30 …… Stage
// Collapsed (about 48 dp) holds the top row only; its ⚠ after the countdown
// says the expanded card shows a clash. Silent, ongoing, shown on the lock
// screen; the status-bar icon tells the state. No progress bar: it could only
// move with extra wakeups.

object NowCardNotification {
  private const val CHANNEL_ID = "now_card"
  private const val NOTIFICATION_ID = 0x4E43 // "NC"

  fun post(context: Context, script: CardScript, span: CardSegment) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
    ) {
      return
    }
    ensureChannel(context, script.channelName)
    val notification = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(smallIcon(span))
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setShowWhen(false)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setCategory(NotificationCompat.CATEGORY_EVENT)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setStyle(NotificationCompat.DecoratedCustomViewStyle())
      .setCustomContentView(collapsed(context, script, span))
      .setCustomBigContentView(expanded(context, script, span))
      .setContentIntent(openIntent(context, script.url))
      .setDeleteIntent(dismissIntent(context))
      .build()
    NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
  }

  fun cancel(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  private fun ensureChannel(context: Context, name: String) {
    val channel = NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_LOW).apply {
      setShowBadge(false)
      lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
      enableVibration(false)
      setSound(null, null)
    }
    context.getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
  }

  private fun smallIcon(span: CardSegment): Int = when {
    span.hasClash -> R.drawable.ic_nowcard_clash
    span.isLive -> R.drawable.ic_nowcard_live
    else -> R.drawable.ic_nowcard_break
  }

  private fun collapsed(context: Context, script: CardScript, span: CardSegment): RemoteViews {
    val rows = RemoteViews(context.packageName, R.layout.nc_rows)
    rows.addView(R.id.nc_rows, topRow(context, script, span, flagClash = span.hasClash))
    return rows
  }

  private fun expanded(context: Context, script: CardScript, span: CardSegment): RemoteViews {
    val rows = RemoteViews(context.packageName, R.layout.nc_rows)
    rows.addView(R.id.nc_rows, topRow(context, script, span, flagClash = false))
    if (span.isLive) {
      val clash = span.clash
      if (clash != null) {
        rows.addView(R.id.nc_rows, RemoteViews(context.packageName, R.layout.nc_divider))
        rows.addView(R.id.nc_rows, clashRow(context, clash, span.more))
      } else if (span.more > 0) {
        rows.addView(R.id.nc_rows, moreRow(context, span.more))
      }
    }
    return rows
  }

  private fun topRow(context: Context, script: CardScript, span: CardSegment, flagClash: Boolean): RemoteViews {
    val set = span.top
    if (!span.isLive) {
      val row = RemoteViews(context.packageName, R.layout.nc_row_break)
      countdown(row, R.id.nc_countdown, set.start)
      fill(row, set)
      return row
    }
    val row = RemoteViews(context.packageName, R.layout.nc_row_live)
    row.setTextViewText(R.id.nc_label, script.liveLabel)
    countdown(row, R.id.nc_countdown, set.end)
    row.setViewVisibility(R.id.nc_flag, if (flagClash) View.VISIBLE else View.GONE)
    fill(row, set)
    return row
  }

  private fun clashRow(context: Context, set: CardSet, more: Int): RemoteViews {
    val row = RemoteViews(context.packageName, R.layout.nc_row_clash)
    countdown(row, R.id.nc_countdown, set.start)
    fill(row, set)
    row.setViewVisibility(R.id.nc_more, if (more > 0) View.VISIBLE else View.GONE)
    row.setTextViewText(R.id.nc_more_count, "+$more")
    return row
  }

  private fun moreRow(context: Context, more: Int): RemoteViews {
    val row = RemoteViews(context.packageName, R.layout.nc_row_more)
    row.setTextViewText(R.id.nc_more_count, "+$more")
    return row
  }

  private fun fill(row: RemoteViews, set: CardSet) {
    row.setTextViewText(R.id.nc_name, set.name)
    row.setTextViewText(R.id.nc_time, set.timeText)
    row.setTextViewText(R.id.nc_stage, set.stage)
  }

  /**
   * A countdown the system ticks while it is on screen: "−48:00", "−1:30:12".
   * Its base is on the time since boot, so a clock or time-zone change needs it
   * set again (NowCardReceiver). It would run on below zero; the alarm at the
   * span's end redraws the card first.
   */
  private fun countdown(row: RemoteViews, id: Int, target: Long) {
    val base = SystemClock.elapsedRealtime() + (target - System.currentTimeMillis())
    row.setChronometer(id, base, "−%s", true)
    row.setChronometerCountDown(id, true)
  }

  private fun openIntent(context: Context, url: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      0,
      intent,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )
  }

  private fun dismissIntent(context: Context): PendingIntent = PendingIntent.getBroadcast(
    context,
    1,
    Intent(context, NowCardReceiver::class.java).setAction(NowCardReceiver.ACTION_DISMISSED),
    PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
  )
}
