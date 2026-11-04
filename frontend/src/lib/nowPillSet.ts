import { getFestivalDayStart } from '../utils/festivalTime';
import type { ConflictInputs } from './conflictUtils';
import { BREAK_WINDOW_OFFSET_MS, liveMustSees, mustSeeSets, type PlannedSet } from './plan';

// ── The set "now" names ───────────────────────────────────────────────────────
//
// The one selection behind the now pill (shell/NowPill.model.ts) and the
// lock-screen now card (lib/nowCard.ts), so the two never name different sets.
// Only today's Must-sees count, of the sets My plan lists (the conflict
// calculation's eligibility rule); Maybe picks never reach it.
//   live  — the live Must-see that started last (the soonest-ending one when
//           they started together), plus how many others play now;
//   break — counting down to the next Must-see today, from the end of the last
//           finished one, or from 08:00 when none has finished yet;
//   none  — nothing to say: outside the festival, before 08:00, after the day's
//           last Must-see, or no Must-see today at all.

type Must = PlannedSet;

/** Today's Must-sees: the sets of the festival day starting at `today` (06:00). */
export function todaysMusts(interests: Record<string, string>, inputs: Pick<ConflictInputs, 'artists' | 'artistEvents'>, today: number): Must[] {
  return mustSeeSets(interests, inputs).filter((m) => getFestivalDayStart(m.event.dateFrom) === today);
}

/** The set the pill names: live (the one started last) or next, or none for the logo. */
export type PillSet =
  | { kind: 'live'; must: Must; others: number }
  | { kind: 'break'; must: Must }
  | null;

/**
 * The one selection the pill makes: what it shows (nowPillModel), where a tap
 * goes (nowPillTarget) and the now card's top row all take its result, so they
 * never name two sets.
 */
export function nowPillSet(
  interests: Record<string, string>,
  inputs: ConflictInputs,
  festivalDays: number[],
  now: number,
): PillSet {
  const today = getFestivalDayStart(now);
  if (!festivalDays.includes(today)) {
    return null;
  }
  const musts = todaysMusts(interests, inputs, today);

  const live = liveMustSees(musts, now)
    .sort((a, b) => b.event.dateFrom - a.event.dateFrom || a.event.dateTo - b.event.dateTo);
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
