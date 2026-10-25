// ── iOS Simulator lookup, shared by the E2E runner and its clean-up ───────────

import { must, skip } from './proc.ts';

export type Sim = { udid: string; name: string; state: string };

/** `--sim`, else $IOS_SIM, else the default device: the one the suite runs on. */
export function simulatorName(args: Record<string, string | true>): string {
  return typeof args.sim === 'string' ? args.sim : (process.env.IOS_SIM ?? 'iPhone 17 Pro');
}

/** By UDID or name; skips the run (exit 4) when there is no such simulator. */
export function findSimulator(wanted: string): Sim {
  const json = JSON.parse(must('xcrun', ['simctl', 'list', 'devices', '--json'])) as {
    devices: Record<string, Array<Sim & { isAvailable: boolean; deviceTypeIdentifier?: string }>>;
  };
  const every = Object.values(json.devices).flat();
  const all = every.filter((d) => d.isAvailable);
  const match = all.find((d) => d.udid === wanted) ?? all.find((d) => d.name === wanted);
  if (match !== undefined) {
    return match;
  }

  // Xcode updates remove old iOS runtimes, and a simulator on a removed runtime
  // stays listed but unusable. While its device type survives, the fix is a new
  // simulator of the same type on the installed runtime.
  const stale = every.find((d) => d.udid === wanted || d.name === wanted);
  const runtime = newestIosRuntime();
  if (stale?.deviceTypeIdentifier !== undefined && runtime !== null && deviceTypeExists(stale.deviceTypeIdentifier)) {
    skip(
      `the "${wanted}" simulator is unusable: its iOS runtime is no longer installed (an Xcode update removes old ones)`,
      `Create it again on the installed runtime, then re-run:\n` +
      `    xcrun simctl create "${wanted}" ${stale.deviceTypeIdentifier} ${runtime}`,
    );
  }
  const names = [...new Set(all.map((d) => d.name))].filter((n) => n.startsWith('iPhone')).join(', ');
  skip(
    `no available simulator named "${wanted}" (an Xcode update may have replaced the models)`,
    `Available: ${names}.\n` +
    `  For one run: IOS_SIM="<name>" npm run verify (or --sim "<name>" on the e2e scripts).\n` +
    `  To stay on it: change the default in scripts/lib/simulator.ts.`,
  );
}

function deviceTypeExists(identifier: string): boolean {
  const json = JSON.parse(must('xcrun', ['simctl', 'list', 'devicetypes', '--json'])) as {
    devicetypes: Array<{ identifier: string }>;
  };
  return json.devicetypes.some((t) => t.identifier === identifier);
}

function newestIosRuntime(): string | null {
  const json = JSON.parse(must('xcrun', ['simctl', 'list', 'runtimes', '--json'])) as {
    runtimes: Array<{ identifier: string; platform?: string; isAvailable: boolean; version: string }>;
  };
  const ios = json.runtimes
    .filter((r) => r.isAvailable && r.identifier.includes('SimRuntime.iOS'))
    .sort((x, y) => x.version.localeCompare(y.version, undefined, { numeric: true }));
  return ios.length === 0 ? null : ios[ios.length - 1].identifier;
}
