// ── Driving the app over adb, with nothing of ours running on the device ──────
//
// Elements are located from `uiautomator dump` BEFORE a measurement, and the
// measured input is then sent with plain `adb input`. Maestro would be simpler
// to write, but its on-device driver keeps reading the view hierarchy while it
// waits for things — on a phone that idles with one of four cores online, that
// competes with the app during exactly the frames being measured.

import { type Device, shell } from './adb.ts';
import { run, sleep } from './proc.ts';

export type UiNode = {
  text: string;
  desc: string;
  id: string;
  cls: string;
  x: number;
  y: number;
};

const unescape = (s: string): string => s
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** The current screen's nodes, each with the centre of its bounds. */
export function dumpUi(d: Device): UiNode[] {
  shell(d, 'uiautomator dump /sdcard/ba-ui.xml >/dev/null 2>&1');
  // exec-out avoids the CRLF mangling `shell cat` does on older devices.
  const xml = run('adb', ['-s', d.serial, 'exec-out', 'cat', '/sdcard/ba-ui.xml']).out;
  const nodes: UiNode[] = [];
  for (const m of xml.matchAll(/<node [^>]*?\/?>/g)) {
    const attr = (k: string): string => unescape(new RegExp(`${k}="([^"]*)"`).exec(m[0])?.[1] ?? '');
    const b = /\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(attr('bounds'));
    if (b === null) {
      continue;
    }
    nodes.push({
      text: attr('text'),
      desc: attr('content-desc'),
      id: attr('resource-id'),
      cls: attr('class'),
      x: Math.round((Number(b[1]) + Number(b[3])) / 2),
      y: Math.round((Number(b[2]) + Number(b[4])) / 2),
    });
  }
  return nodes;
}

export type Match = { text?: string; desc?: string; id?: string; cls?: string };

const matches = (n: UiNode, m: Match): boolean =>
  (m.text === undefined || n.text === m.text)
  && (m.desc === undefined || n.desc === m.desc)
  && (m.id === undefined || n.id === m.id || n.id.endsWith(`:id/${m.id}`))
  && (m.cls === undefined || n.cls === m.cls);

export function find(nodes: UiNode[], m: Match): UiNode | undefined {
  return nodes.find((n) => matches(n, m));
}

/** Polls the screen until an element appears; throws with what *was* visible. */
export async function waitFor(d: Device, m: Match, timeoutMs = 20_000): Promise<UiNode> {
  const until = Date.now() + timeoutMs;
  let last: UiNode[] = [];
  while (Date.now() < until) {
    last = dumpUi(d);
    const hit = find(last, m);
    if (hit !== undefined) {
      return hit;
    }
    await sleep(500);
  }
  const seen = [...new Set(last.map((n) => n.text || n.desc).filter(Boolean))].slice(0, 12);
  throw new Error(`timed out waiting for ${JSON.stringify(m)}; on screen: ${seen.join(' | ')}`);
}

export function tap(d: Device, n: UiNode): void {
  shell(d, `input tap ${n.x} ${n.y}`);
}

export async function tapWhenVisible(d: Device, m: Match, timeoutMs?: number): Promise<void> {
  tap(d, await waitFor(d, m, timeoutMs));
}
