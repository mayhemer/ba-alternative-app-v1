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
// Spec: docs/frontend/design/lock-screen.md, layout #4 on Android: two lines at
// the notification's text size.
//   live   BAND NAME ……………………………… [⚠ +N]     break  NEXT: BAND NAME
//          ● LIVE −48:00 … 19:00–20:00 · Stage           −1:30:12 … 14:00–14:50 · Stage
// Collapsed, a clash shows only as ⚠ +N: the clashing bands it doesn't name.
// Expanded (where Android offers it), a clash adds iOS's clash row under a line:
//          THE NEXT CLASHING BAND ………………… [+N]
//          −28:00 ⚠ ……………… 19:40–20:30 · Stage
// Colours tell the state too (yellow live, blue break, red clash). Silent, ongoing, shown on the lock
// screen; the status-bar icon tells the state as the iPhone's Dynamic Island
// does (dot, ⚠, ›). No progress bar: it could only move with extra wakeups.

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
      .setCustomContentView(card(context, script, span, flagClash = true))
      .apply { expanded(context, script, span)?.let { setCustomBigContentView(it) } }
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

  /** As the iPhone's Dynamic Island: ⚠ only with a clashing set to come, else the live dot; › in a break. */
  private fun smallIcon(span: CardSegment): Int = when {
    span.isLive && span.clash != null -> R.drawable.ic_nowcard_clash
    span.isLive -> R.drawable.ic_nowcard_live
    else -> R.drawable.ic_nowcard_break
  }

  /** The expanded card when there is a clash to name; null leaves Android's default (the card). */
  private fun expanded(context: Context, script: CardScript, span: CardSegment): RemoteViews? {
    val clash = span.clash
    if (!span.isLive || clash == null) {
      return null
    }
    val rows = RemoteViews(context.packageName, R.layout.nc_rows)
    rows.addView(R.id.nc_rows, card(context, script, span, flagClash = false))
    rows.addView(R.id.nc_rows, RemoteViews(context.packageName, R.layout.nc_divider))
    val row = RemoteViews(context.packageName, R.layout.nc_card_clash_row)
    countdown(row, R.id.nc_countdown, clash.start)
    row.setViewVisibility(R.id.nc_more, if (span.more > 0) View.VISIBLE else View.GONE)
    row.setTextViewText(R.id.nc_more, "+${span.more}")
    fill(row, clash)
    rows.addView(R.id.nc_rows, row)
    return rows
  }

  /** The two-line card; `flagClash`: ⚠ +N on the name line (off when the clash row names the band). */
  private fun card(context: Context, script: CardScript, span: CardSegment, flagClash: Boolean): RemoteViews {
    val set = span.top
    if (!span.isLive) {
      val card = RemoteViews(context.packageName, R.layout.nc_card_break)
      card.setTextViewText(R.id.nc_heading, "${script.nextLabel}:")
      countdown(card, R.id.nc_countdown, set.start)
      fill(card, set)
      return card
    }
    val card = RemoteViews(context.packageName, R.layout.nc_card_live)
    card.setTextViewText(R.id.nc_label, script.liveLabel)
    countdown(card, R.id.nc_countdown, set.end)
    val unnamed = if (flagClash) span.unnamedClashes else 0
    card.setViewVisibility(R.id.nc_flag, if (unnamed > 0) View.VISIBLE else View.GONE)
    card.setViewVisibility(R.id.nc_more, if (unnamed > 0) View.VISIBLE else View.GONE)
    card.setTextViewText(R.id.nc_more, "+$unnamed")
    fill(card, set)
    return card
  }

  private fun fill(row: RemoteViews, set: CardSet) {
    row.setTextViewText(R.id.nc_name, set.name)
    row.setTextViewText(R.id.nc_time, "${set.timeText} · ")
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
