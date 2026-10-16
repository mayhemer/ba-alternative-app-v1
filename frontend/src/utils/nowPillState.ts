import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import type { PlanInputs } from './planUtils';
import type { DbEvent } from '../types/backend';

// ── What the now pill in the top bar says ─────────────────────────────────────
//
// Only today's Must-sees count; Maybe picks never reach the pill.
//   live  — the live Must-see that ends soonest (its time left is the deadline
//           for deciding whether to switch), plus how many others play now;
//   break — counting down to the next Must-see today, from the end of the last
//           finished one, or from 08:00 when none has finished yet;
//   logo  — nothing to say: outside the festival, before 08:00, after the day's
//           last Must-see, or no Must-see today at all.

export type NowPillState =
  | { kind: 'logo' }
  | { kind: 'live'; artistName: string; remainingMs: number; progress: number; more: number }
  | { kind: 'break'; artistName: string; remainingMs: number };

const LOGO: NowPillState = { kind: 'logo' };

/** The day's break window opens two hours after the 06:00 boundary: 08:00. */
const BREAK_DAY_OFFSET_MS = 2 * 60 * 60 * 1000;

type Must = { event: DbEvent; artistName: string };

function todaysMusts(interests: Record<string, string>, { artists, artistEvents }: PlanInputs, today: number): Must[] {
  const musts: Must[] = [];
  for (const artist of artists) {
    if (interests[artist.artistId] !== 'will_go') {
      continue;
    }
    for (const event of artistEvents[artist.artistId] ?? []) {
      if (getFestivalDayStart(event.dateFrom) === today) {
        musts.push({ event, artistName: artist.name });
      }
    }
  }
  return musts;
}

export function nowPillState(
  interests: Record<string, string>,
  inputs: PlanInputs,
  festivalDays: number[],
  now: number,
): NowPillState {
  const today = getFestivalDayStart(now);
  if (!festivalDays.includes(today)) {
    return LOGO;
  }
  const musts = todaysMusts(interests, inputs, today);

  const live = musts
    .filter((m) => m.event.dateFrom <= now && now < m.event.dateTo)
    .sort((a, b) => a.event.dateTo - b.event.dateTo);
  if (live.length > 0) {
    const { event, artistName } = live[0];
    return {
      kind: 'live',
      artistName,
      remainingMs: event.dateTo - now,
      progress: (now - event.dateFrom) / (event.dateTo - event.dateFrom),
      more: live.length - 1,
    };
  }

  const next = musts
    .filter((m) => m.event.dateFrom > now)
    .sort((a, b) => a.event.dateFrom - b.event.dateFrom)[0];
  if (next === undefined) {
    return LOGO;
  }
  const breakFrom = Math.max(
    today + BREAK_DAY_OFFSET_MS,
    ...musts.filter((m) => m.event.dateTo <= now).map((m) => m.event.dateTo),
  );
  if (now < breakFrom) {
    return LOGO;
  }
  return { kind: 'break', artistName: next.artistName, remainingMs: next.event.dateFrom - now };
}
