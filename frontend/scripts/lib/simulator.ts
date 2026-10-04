// ── iOS Simulator lookup, shared by the E2E runner and its clean-up ───────────

import { must, skip } from './proc.ts';

export type Sim = { udid: string; name: string; state: string };

/** `--sim`, else $IOS_SIM, else the default device: the one the suite runs on. */
export function simulatorName(args: Record<string, string | true>): string {
  return typeof args.sim === 'string' ? args.sim : (process.env.IOS_SIM ?? 'iPhone 17 Pro');
}

/** By UDID or name; skips the run (exit 4) when there is no such simulator. */
export function findSimulator(wanted: string): Sim {
  const json = JSON.parse(must('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])) as {
    devices: Record<string, Sim[]>;
  };
  const all = Object.values(json.devices).flat();
  const match = all.find((d) => d.udid === wanted) ?? all.find((d) => d.name === wanted);
  if (match === undefined) {
    const names = [...new Set(all.map((d) => d.name))].filter((n) => n.startsWith('iPhone')).join(', ');
    skip(`no available simulator named "${wanted}"`, `Available: ${names}. Pass --sim "<name>".`);
  }
  return match;
}
