import { getFestivalDayStart } from '../timeline/timelineLayout';
import { isConflictEligible } from '../../utils/conflictUtils';
import { BREAK_WINDOW_OFFSET_MS, type PlanInputs } from '../../utils/planUtils';
import { formatRemaining, planStrings } from './planStrings';
import type { DbEvent } from '../../types/backend';

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

const strings = planStrings();

export type NowPillModel =
  | { kind: 'logo' }
  | { kind: 'live'; artistName: string; label: string; time: string; progress: number; more: number; accessibilityLabel: string }
  | { kind: 'break'; artistName: string; time: string; till: string; accessibilityLabel: string };

const LOGO: NowPillModel = { kind: 'logo' };

type Must = { event: DbEvent; artistName: string };

function todaysMusts(interests: Record<string, string>, { artists, artistEvents }: PlanInputs, today: number): Must[] {
  const musts: Must[] = [];
  for (const artist of artists) {
    if (interests[artist.artistId] !== 'will_go') {
      continue;
    }
    for (const event of artistEvents[artist.artistId] ?? []) {
      if (isConflictEligible(event) && getFestivalDayStart(event.dateFrom) === today) {
        musts.push({ event, artistName: artist.name });
      }
    }
  }
  return musts;
}

export function nowPillModel(
  interests: Record<string, string>,
  inputs: PlanInputs,
  festivalDays: number[],
  now: number,
): NowPillModel {
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
    const time = formatRemaining(event.dateTo - now);
    return {
      kind: 'live',
      artistName,
      label: strings.live,
      time,
      progress: (now - event.dateFrom) / (event.dateTo - event.dateFrom),
      more: live.length - 1,
      accessibilityLabel: `${artistName} ${strings.live} ${time}`,
    };
  }

  const next = musts
    .filter((m) => m.event.dateFrom > now)
    .sort((a, b) => a.event.dateFrom - b.event.dateFrom)[0];
  if (next === undefined) {
    return LOGO;
  }
  const breakFrom = Math.max(
    today + BREAK_WINDOW_OFFSET_MS,
    ...musts.filter((m) => m.event.dateTo <= now).map((m) => m.event.dateTo),
  );
  if (now < breakFrom) {
    return LOGO;
  }
  const time = formatRemaining(next.event.dateFrom - now);
  return { kind: 'break', artistName: next.artistName, time, till: strings.till, accessibilityLabel: `${time} ${strings.till} ${next.artistName}` };
}
