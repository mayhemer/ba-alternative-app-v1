// ── adb helpers for the device runners ────────────────────────────────────────

import { must, run, skip } from './proc.ts';

export const PACKAGE = 'cz.janbambas.ba';

export type Device = { serial: string; model: string; android: string; sdk: number };

/** The device to use: --serial when given, otherwise the only one connected. */
export function pickDevice(serialArg: string | undefined): Device {
  const r = run('adb', ['devices']);
  if (!r.ok) {
    skip('adb is not available', 'brew install --cask android-platform-tools');
  }
  const serials = r.out.split('\n').slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((p) => p[1] === 'device')
    .map((p) => p[0]);

  let serial = serialArg;
  if (serial === undefined) {
    if (serials.length === 0) {
      skip('no Android device connected', 'Connect it over USB with USB debugging on, then check `adb devices`.');
    }
    if (serials.length > 1) {
      skip(`${serials.length} devices connected (${serials.join(', ')})`, 'Pick one with --serial <id>.');
    }
    serial = serials[0];
  } else if (!serials.includes(serial)) {
    skip(`device ${serial} is not connected`);
  }

  const prop = (k: string): string => must('adb', ['-s', serial, 'shell', 'getprop', k]);
  return {
    serial,
    model: prop('ro.product.model'),
    android: prop('ro.build.version.release'),
    sdk: Number(prop('ro.build.version.sdk')),
  };
}

export function shell(d: Device, cmd: string): string {
  return run('adb', ['-s', d.serial, 'shell', cmd]).out;
}

export function adb(d: Device, args: string[]): string {
  return must('adb', ['-s', d.serial, ...args]);
}

/** Installed versionCode of the app, or null when it is not installed. */
export function installedVersion(d: Device): string | null {
  const m = /versionCode=(\d+)/.exec(shell(d, `dumpsys package ${PACKAGE}`));
  return m === null ? null : m[1];
}
