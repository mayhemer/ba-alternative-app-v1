// ── EAS build lookup, download, and staleness ─────────────────────────────────
//
// Both device runners test a *built binary*, not the working tree, so they need
// to know which commit a build came from and say so when it is behind HEAD — a
// green run against a stale build is otherwise indistinguishable from a green
// run against your change.

import { createWriteStream, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { must, run } from './proc.ts';

export type EasBuild = {
  id: string;
  profile: string;
  buildVersion: string;
  commit: string | null;
  url: string;
};

type RawBuild = {
  id: string;
  status: string;
  buildProfile: string;
  appBuildVersion: string;
  gitCommitHash?: string | null;
  artifacts?: { buildUrl?: string };
};

/** Newest finished build for a profile, or null when there is none. */
export function latestBuild(platform: 'android' | 'ios', profile: string): EasBuild | null {
  const r = run('eas', [
    'build:list', '--platform', platform, '--build-profile', profile,
    '--limit', '10', '--json', '--non-interactive',
  ]);
  if (!r.ok) {
    throw new Error(`eas build:list failed — logged in? (${r.err.split('\n')[0]})`);
  }
  const builds = JSON.parse(r.out) as RawBuild[];
  const done = builds.find((b) => b.status === 'FINISHED' && b.artifacts?.buildUrl);
  if (done === undefined) {
    return null;
  }
  return {
    id: done.id,
    profile: done.buildProfile,
    buildVersion: done.appBuildVersion,
    commit: done.gitCommitHash ?? null,
    url: done.artifacts!.buildUrl!,
  };
}

/** The build for one specific build number (versionCode), or null. */
export function buildByVersion(platform: 'android' | 'ios', version: string): EasBuild | null {
  const r = run('eas', [
    'build:list', '--platform', platform, '--app-build-version', version,
    '--limit', '1', '--json', '--non-interactive',
  ]);
  if (!r.ok) {
    return null;
  }
  const b = (JSON.parse(r.out) as RawBuild[])[0];
  if (b === undefined) {
    return null;
  }
  return {
    id: b.id,
    profile: b.buildProfile,
    buildVersion: b.appBuildVersion,
    commit: b.gitCommitHash ?? null,
    url: b.artifacts?.buildUrl ?? '',
  };
}

/**
 * Human-readable staleness of a build relative to HEAD. Counts commits on HEAD
 * that the build does not contain, and says so plainly when the build's commit
 * is not in local history at all.
 */
export function staleness(commit: string | null): { behind: number | null; note: string } {
  if (commit === null) {
    return { behind: null, note: 'build has no recorded commit' };
  }
  const short = commit.slice(0, 7);
  if (!run('git', ['cat-file', '-e', `${commit}^{commit}`]).ok) {
    return { behind: null, note: `built from ${short}, which is not in local history` };
  }
  const behind = Number(must('git', ['rev-list', '--count', `${commit}..HEAD`]));
  const dirty = run('git', ['status', '--porcelain', '--', '.']).out !== '';
  const note = behind === 0
    ? `built from ${short} (HEAD)${dirty ? ' — but the working tree has uncommitted changes' : ''}`
    : `built from ${short}, ${behind} commit${behind === 1 ? '' : 's'} behind HEAD`;
  return { behind, note };
}

// Builds are cached by EAS build id, so re-running against the same build costs
// nothing. node_modules/.cache is already ignored by git.
export const BUILD_CACHE = join(process.cwd(), 'node_modules', '.cache', 'ba-builds');

/** Downloads a build artifact once; returns the cached file path. */
export async function fetchArtifact(build: EasBuild, fileName: string): Promise<string> {
  const dir = join(BUILD_CACHE, build.id);
  const file = join(dir, fileName);
  if (existsSync(file)) {
    return file;
  }
  mkdirSync(dir, { recursive: true });
  const res = await fetch(build.url);
  if (!res.ok || res.body === null) {
    throw new Error(`download failed (${res.status}) for build ${build.id}`);
  }
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(file));
  return file;
}

/** Finds the first `*.app` bundle inside an extracted simulator archive. */
export function findAppBundle(dir: string): string | null {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && entry.name.endsWith('.app')) {
      return p;
    }
    if (entry.isDirectory()) {
      const inner = findAppBundle(p);
      if (inner !== null) {
        return inner;
      }
    }
  }
  return null;
}
