# Device performance (Android)

Measured on a real low-end phone — currently a Nokia 3 (TA-1032, Android 9, MediaTek MT6737, 2 GB) —
because neither Node nor a browser can see what makes the app slow there: Hermes instead of a JIT,
native view creation, and a CPU that idles with three of its four cores switched off.

```bash
npm run build:perf:android      # once per app change; EAS cloud
npm run install:perf:android    # newest perf build onto the phone (cached by build id)
npm run test:perf:device        # --runs N, --warmup N, --scenarios a,b, --baseline
```

Scenarios: **cold start** (first frame, and the moment the app is usable via a logcat marker the perf
build emits), **list fling**, **detail open** (the artist sheet over the list), **search typing** (the
Intl collation path), **timeline day switch** and **timeline pan** (a settled day, panned out and
back). Each reports `dumpsys gfxinfo` frame stats — p50/p90/p99 and mean frame time, frames of 34 ms
or more, slow-UI-thread count, janky % (pinned near 100 % on this phone, so mostly useless) — and
memory from `dumpsys meminfo`. The day switch also reports **mountMs**: from the tap's handler to
the frame after the day's last slice mounted, from two logcat marks (`src/utils/perfMarks.ts`) — the
JS-side cost frame stats cannot see. It needs a perf build that has the marks, and reads `n/a` on an
older one.

Driven over adb, but each measured window runs on the phone by itself. Elements are found with
`uiautomator dump` beforehand. Then one adb call starts a small injector
(`scripts/android-inject/`, run with `app_process` the way `input` is) that resets the frame stats,
plays the gestures and reads the stats back. Why not `adb shell input`: on this phone each call boots
a runtime for about a second of CPU — inside the window, once per gesture — and its swipe waits for
the app after every move, so a janky frame changed the release velocity and the fling travelled a
different distance on each run. The injector boots before the window opens and stamps every event
from a fixed schedule, so the same gesture flings the same way every time. It is built on demand
with the JDK and r8 (fetched once into `node_modules/.cache`), pushed to `/data/local/tmp` and
removed afterwards. Maestro would be easier to write, but its on-device driver polls the view tree
while it waits, competing with the app for exactly the frames being measured.

Scrolling never runs into an edge: the list and the timeline first go to a fixed place (from an edge,
by plain drags that do not fling), and every run goes out and back with mirrored flings. Coming back
to the start is the check — a fling an edge stopped short cannot — so each run reports **driftPx** and
is flagged when that exceeds about a row. The timeline pans horizontally only: a day's lanes overflow
the screen by about one lane, so a vertical fling can only hit both ends.

For repeatability the runner keeps the screen on, kills background processes, routes the fixture
API over USB (`adb reverse`) and **switches Wi-Fi off for the run** — restored afterwards, including on
Ctrl-C. It also **wipes the app's data** (`pm clear`) at the start of every session: the app would
otherwise reopen whatever edition it was last left on, possibly one the fixtures do not have, and
keep data another build cached, which the older fixtures never replace. The phone is for perf runs
only. One unmeasured launch then downloads the build's default edition (ba2025), and the runner waits
until the app has fetched its bios; it fails if the app asks for an edition the fixtures lack. It waits for the battery to cool before every repetition: Android 9 has no thermal service and
the CPU sensors need root, so the battery is the only gauge available. After cooling it idles a fixed
3 s, so every window starts from the same CPU state, and each scenario plays one unrecorded warm-up
run first (`--warmup N`). Cold start waits for its marker with one blocked `logcat` on the phone
rather than polling the log over USB. The battery level and the app's dexopt state are recorded:
charging warms the battery the cooling waits on, and background dexopt makes the same build faster
over days.

Set the phone's screen lock to **None**; automation cannot type a PIN.

It is **report-only** for now: medians against `perf/devices/<model>.json` with a 🔴 above +20%, but
no failure. A baseline recorded with an earlier method (`meta.method`) is not compared against. Thresholds need the noise floor first — record a baseline, then run it a few times on
unchanged code and see how far it moves.
