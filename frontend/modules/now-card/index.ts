import { requireOptionalNativeModule } from 'expo';
import type { NowCardSegment } from '../../src/lib/nowCard';

// ── The lock-screen now card: native side ─────────────────────────────────────
//
// iOS: a Live Activity (Swift in ./ios, its look in /targets/now-card).
// Android: an ongoing notification (Kotlin in ./android).
// The app hands over the whole precomputed script (lib/nowCard.ts); the native
// side only picks the span holding "now", draws it, and switches at each span's
// end (iOS: once by itself through the stale date, then on the next app open or
// background refresh; Android: an exact alarm at every switch). No festival
// logic lives in native code.
//
// Absent on web, in Jest and in Expo Go: every call is then a no-op.

/** What crosses to native code, as JSON. Bump `version` when its shape changes. */
export type NowCardPayload = {
  version: 1;
  segments: NowCardSegment[];
  strings: {
    /** The live row's status label: "LIVE" / "HRAJE". */
    live: string;
    /** The heading over the next Must-see in a break: "NEXT UP" / "NÁSLEDUJE" (Android: expanded only). */
    next: string;
    /** iOS: shown once the day's last Must-see is over and the card has not been removed yet. */
    over: string;
    /** Android: the notification channel's name in the system settings. */
    channel: string;
  };
  /** Opened by a tap on the card (navigation/nowCardLink.ts). */
  url: string;
};

/** Android's notification permission; iOS answers whether Live Activities are allowed. */
export type NowCardPermission = 'granted' | 'denied' | 'undetermined';

type NativeNowCard = {
  setScript(json: string): Promise<void>;
  stop(): Promise<void>;
  getPermission(): Promise<NowCardPermission>;
  requestPermission(): Promise<NowCardPermission>;
  isEnabled(): Promise<boolean>;
  setEnabled(enabled: boolean): Promise<void>;
};

const native = requireOptionalNativeModule<NativeNowCard>('NowCard');

/** Whether this build has the native side at all (not on web, in Jest or Expo Go). */
export const nowCardAvailable = native !== null;

/** Hands the card its script; it shows, updates or ends itself from it. */
export async function setNowCardScript(payload: NowCardPayload): Promise<void> {
  await native?.setScript(JSON.stringify(payload));
}

/** Ends the card and forgets its script. */
export async function stopNowCard(): Promise<void> {
  await native?.stop();
}

export async function getNowCardPermission(): Promise<NowCardPermission> {
  return native !== null ? native.getPermission() : 'denied';
}

/** Android: the system's notification permission dialog. iOS: only reads the setting. */
export async function requestNowCardPermission(): Promise<NowCardPermission> {
  return native !== null ? native.requestPermission() : 'denied';
}

/** Android: the app's own on/off switch (Settings). Always on for iOS, where the system switch rules. */
export async function isNowCardEnabled(): Promise<boolean> {
  return native !== null ? native.isEnabled() : false;
}

export async function setNowCardEnabled(enabled: boolean): Promise<void> {
  await native?.setEnabled(enabled);
}
