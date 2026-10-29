import { getFestivalDayStart } from '../../utils/festivalTime';
import { isConflictEligible } from '../../features/conflicts/conflictUtils';
import { BREAK_WINDOW_OFFSET_MS, type PlanInputs } from './planUtils';
import { formatRemaining, NARROW_SPACE, planStrings } from './planStrings';
import { timelineJump, type TimelineJump } from '../../navigation/timelineJump';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── What the now pill in the top bar says ─────────────────────────────────────
//
// Only today's Must-sees count, of the sets My plan lists (the conflict
// calculation's eligibility rule); Maybe picks never reach the pill, so unlike
// the plan list it ignores the Maybe switch.
//   live  — the live Must-see that ends soonest (its time left is the deadline
//           for deciding whether to switch), plus how many others play now;
//   break — counting down to the next Must-see today, from the end of the last
//           finished one, or from 08:00 when none has finished yet;
//   logo  — nothing to say: outside the festival, before 08:00, after the day's
//           last Must-see, or no Must-see today at all.
// One selection (pillSet) picks the set the pill names; nowPillTarget hands the
// same set to a tap on My plan, which opens its timeline (see nowPillTap).

const strings = planStrings();

export type NowPillModel =
  | { kind: 'logo' }
  | { kind: 'live'; artistName: string; time: string; progress: number; more: number; accessibilityLabel: string }
  | { kind: 'break'; artistName: string; time: string; accessibilityLabel: string };

/** The set the pill names, and where it is on the timelines. */
export type NowPillTarget = { event: DbEvent; jump: TimelineJump };

const LOGO: NowPillModel = { kind: 'logo' };

type Must = { event: DbEvent; artist: DbArtist };

function todaysMusts(interests: Record<string, string>, { artists, artistEvents }: PlanInputs, today: number): Must[] {
  const musts: Must[] = [];
  for (const artist of artists) {
    if (interests[artist.artistId] !== 'will_go') {
      continue;
    }
    for (const event of artistEvents[artist.artistId] ?? []) {
      if (isConflictEligible(event) && getFestivalDayStart(event.dateFrom) === today) {
        musts.push({ event, artist });
      }
    }
  }
  return musts;
}

/** The set the pill names: live (the one ending soonest) or next, or none for the logo. */
type PillSet =
  | { kind: 'live'; must: Must; others: number }
  | { kind: 'break'; must: Must }
  | null;

function pillSet(
  interests: Record<string, string>,
  inputs: PlanInputs,
  festivalDays: number[],
  now: number,
): PillSet {
  const today = getFestivalDayStart(now);
  if (!festivalDays.includes(today)) {
    return null;
  }
  const musts = todaysMusts(interests, inputs, today);

  const live = musts
    .filter((m) => m.event.dateFrom <= now && now < m.event.dateTo)
    .sort((a, b) => a.event.dateTo - b.event.dateTo);
  if (live.length > 0) {
    return { kind: 'live', must: live[0], others: live.length - 1 };
  }

  const next = musts
    .filter((m) => m.event.dateFrom > now)
    .sort((a, b) => a.event.dateFrom - b.event.dateFrom)[0];
  if (next === undefined) {
    return null;
  }
  const breakFrom = Math.max(
    today + BREAK_WINDOW_OFFSET_MS,
    ...musts.filter((m) => m.event.dateTo <= now).map((m) => m.event.dateTo),
  );
  if (now < breakFrom) {
    return null;
  }
  return { kind: 'break', must: next };
}

export function nowPillModel(
  interests: Record<string, string>,
  inputs: PlanInputs,
  festivalDays: number[],
  now: number,
): NowPillModel {
  const set = pillSet(interests, inputs, festivalDays, now);
  if (set === null) {
    return LOGO;
  }
  const { event, artist } = set.must;
  if (set.kind === 'live') {
    const time = formatRemaining(event.dateTo - now, NARROW_SPACE);
    return {
      kind: 'live',
      artistName: artist.name,
      time,
      progress: (now - event.dateFrom) / (event.dateTo - event.dateFrom),
      more: set.others,
      accessibilityLabel: `${artist.name} ${strings.live} ${time}`,
    };
  }
  const time = formatRemaining(event.dateFrom - now, NARROW_SPACE);
  return {
    kind: 'break',
    artistName: artist.name,
    time,
    accessibilityLabel: `${artist.name} ${strings.start} ${time}`,
  };
}

/** The set the pill names and where it is drawn; null while the pill shows the logo. */
export function nowPillTarget(
  interests: Record<string, string>,
  inputs: PlanInputs,
  festivalDays: number[],
  now: number,
): NowPillTarget | null {
  const set = pillSet(interests, inputs, festivalDays, now);
  if (set === null) {
    return null;
  }
  return { event: set.must.event, jump: timelineJump(set.must.artist, set.must.event) };
}

// ── What a tap does ───────────────────────────────────────────────────────────
//
// The pill toggles between My plan and the timeline: on My plan showing today a
// tap shows the pill's set's timeline at now (My plan's own "now" is a tap on
// today's day button); anywhere else, My plan on another day included, it opens
// My plan on today at now. The logo has no set and is not a button.

export type NowPillTap =
  | { kind: 'none' }
  | { kind: 'plan' }
  | { kind: 'timeline'; target: NowPillTarget };

/**
 * `activeRoute` is the drawer screen shown, undefined before navigation is
 * ready; `planShowsToday`, whether My plan's shown day is today.
 */
export function nowPillTap(activeRoute: string | undefined, target: NowPillTarget | null, planShowsToday: boolean): NowPillTap {
  if (target === null) {
    return { kind: 'none' };
  }
  if (activeRoute === 'MyPlan' && planShowsToday) {
    return { kind: 'timeline', target };
  }
  return { kind: 'plan' };
}
