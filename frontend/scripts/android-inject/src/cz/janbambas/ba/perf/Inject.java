package cz.janbambas.ba.perf;

import android.hardware.input.InputManager;
import android.os.SystemClock;
import android.view.InputEvent;
import android.view.KeyCharacterMap;
import android.view.KeyEvent;
import android.view.MotionEvent;
import java.io.InputStream;

// ── Deterministic input for the device perf runner ────────────────────────────
//
//   CLASSPATH=/data/local/tmp/ba-inject.jar app_process /system/bin \
//     cz.janbambas.ba.perf.Inject sh 'dumpsys gfxinfo … reset' \
//     swipe 360 1000 360 300 200 0  wait 2500  swipe 360 300 360 1000 200 0
//
// Why not `adb shell input`: on Android 9 every `input` call boots a fresh
// runtime (hundreds of ms of CPU on the Nokia 3) inside the measured window,
// and its swipe sends moves in a busy loop that waits for the app to finish
// each one — so a janky frame thins out the gesture, the release velocity
// changes, and the fling travels a different distance on every run.
//
// Here the runtime boots once, before the `sh` step that opens the window.
// Every event's timestamp comes from a fixed schedule, not from the clock when
// it happened to be sent, and injection is asynchronous. VelocityTracker reads
// those timestamps, so the same gesture gives the same fling every run however
// busy the phone is. A late wake-up only delays delivery; it is reported, so
// the runner can tell when even that went wrong.
//
// Steps, run in order:
//   sh <command>                    run it and wait (opens/closes the window)
//   swipe x1 y1 x2 y2 <ms> <holdMs> linear drag; holdMs > 0 keeps the finger
//                                   still before lifting, so it does not fling
//   tap x y
//   text <chars> <msPerKey>
//   wait <ms>
//
// Prints one line, `inject events=<n> lateMaxMs=<ms> lateOver8=<n>`.
public final class Inject {
    private static final int SOURCE_TOUCHSCREEN = 0x1002;
    private static final int SOURCE_KEYBOARD = 0x101;
    private static final long MOVE_INTERVAL_MS = 10;
    // Room for the first event after a step that took an unknown time.
    private static final long LEAD_MS = 20;

    private final InputManager input = InputManager.getInstance();
    private long cursor;
    private int events;
    private long lateMax;
    private int lateOver8;

    public static void main(String[] args) throws Exception {
        new Inject().run(args);
    }

    private void run(String[] a) throws Exception {
        cursor = SystemClock.uptimeMillis() + LEAD_MS;
        int i = 0;
        while (i < a.length) {
            String step = a[i++];
            if (step.equals("sh")) {
                sh(a[i++]);
                cursor = SystemClock.uptimeMillis() + LEAD_MS;
            } else if (step.equals("swipe")) {
                swipe(f(a[i]), f(a[i + 1]), f(a[i + 2]), f(a[i + 3]), l(a[i + 4]), l(a[i + 5]));
                i += 6;
            } else if (step.equals("tap")) {
                tap(f(a[i]), f(a[i + 1]));
                i += 2;
            } else if (step.equals("text")) {
                text(a[i], l(a[i + 1]));
                i += 2;
            } else if (step.equals("wait")) {
                cursor += l(a[i++]);
                sleepUntil(cursor);
            } else {
                throw new IllegalArgumentException("unknown step: " + step);
            }
        }
        System.out.println("inject events=" + events + " lateMaxMs=" + lateMax + " lateOver8=" + lateOver8);
    }

    private void swipe(float x1, float y1, float x2, float y2, long ms, long holdMs) throws InterruptedException {
        long down = cursor;
        motion(down, down, MotionEvent.ACTION_DOWN, x1, y1);
        for (long t = MOVE_INTERVAL_MS; t <= ms; t += MOVE_INTERVAL_MS) {
            float k = (float) t / ms;
            motion(down, down + t, MotionEvent.ACTION_MOVE, x1 + (x2 - x1) * k, y1 + (y2 - y1) * k);
        }
        // A still finger: Android 9's VelocityTracker only forgets motion when a
        // new move arrives, so holding means moving on the spot, not going quiet.
        for (long t = MOVE_INTERVAL_MS; t <= holdMs; t += MOVE_INTERVAL_MS) {
            motion(down, down + ms + t, MotionEvent.ACTION_MOVE, x2, y2);
        }
        long up = down + ms + Math.max(holdMs, 0) + MOVE_INTERVAL_MS;
        motion(down, up, MotionEvent.ACTION_UP, x2, y2);
        cursor = up;
    }

    private void tap(float x, float y) throws InterruptedException {
        long down = cursor;
        motion(down, down, MotionEvent.ACTION_DOWN, x, y);
        motion(down, down + 60, MotionEvent.ACTION_UP, x, y);
        cursor = down + 60;
    }

    private void text(String chars, long msPerKey) throws InterruptedException {
        KeyCharacterMap map = KeyCharacterMap.load(KeyCharacterMap.VIRTUAL_KEYBOARD);
        for (char c : chars.toCharArray()) {
            KeyEvent[] keys = map.getEvents(new char[] {c});
            if (keys == null) {
                throw new IllegalArgumentException("cannot type: " + c);
            }
            sleepUntil(cursor);
            for (KeyEvent k : keys) {
                KeyEvent e = new KeyEvent(cursor, cursor, k.getAction(), k.getKeyCode(), 0, k.getMetaState());
                e.setSource(SOURCE_KEYBOARD);
                inject(e, cursor);
            }
            cursor += msPerKey;
        }
    }

    private void motion(long down, long at, int action, float x, float y) throws InterruptedException {
        sleepUntil(at);
        MotionEvent e = MotionEvent.obtain(down, at, action, x, y, 0);
        e.setSource(SOURCE_TOUCHSCREEN);
        inject(e, at);
        e.recycle();
    }

    private void inject(InputEvent e, long scheduled) {
        long late = SystemClock.uptimeMillis() - scheduled;
        lateMax = Math.max(lateMax, late);
        if (late > 8) {
            lateOver8++;
        }
        input.injectInputEvent(e, InputManager.INJECT_INPUT_EVENT_MODE_ASYNC);
        events++;
    }

    private static void sleepUntil(long at) throws InterruptedException {
        long left = at - SystemClock.uptimeMillis();
        if (left > 0) {
            Thread.sleep(left);
        }
    }

    private static void sh(String command) throws Exception {
        Process p = new ProcessBuilder("/system/bin/sh", "-c", command).redirectErrorStream(true).start();
        InputStream out = p.getInputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = out.read(buf)) > 0) {
            System.out.write(buf, 0, n);
        }
        System.out.flush();
        p.waitFor();
    }

    private static float f(String s) {
        return Float.parseFloat(s);
    }

    private static long l(String s) {
        return Long.parseLong(s);
    }
}
