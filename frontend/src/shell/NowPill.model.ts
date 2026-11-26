import type { PillSet } from '../lib/nowPillSet';
import { formatRemaining, NARROW_SPACE } from '../screens/my-plan/planDurations';
import { strings } from '../i18n/strings';

// ── What the now pill in the top bar says ─────────────────────────────────────
//
// Only today's Must-sees count, of the sets My plan lists (the conflict
// calculation's eligibility rule); Maybe picks never reach the pill, so unlike
// the plan list it ignores the Maybe switch.
//   live  — the live Must-see that started last (the soonest-ending one when
//           they started together), plus how many others play now;
//   break — counting down to the next Must-see today, from the end of the last
//           finished one, or from 08:00 when none has finished yet;
//   logo  — nothing to say: outside the festival, before 08:00, after the day's
//           last Must-see, or no Must-see today at all.
// One selection (nowPillSet, in lib/ because the lock-screen now card follows it
// too) picks the set the pill names. A tap always opens My plan on today,
// scrolled to now (shell/openPlanAtNow); the logo is not a button.

export type NowPillModel =
  | { kind: 'logo' }
  | { kind: 'live'; artistName: string; time: string; progress: number; more: number; accessibilityLabel: string }
  | { kind: 'break'; artistName: string; time: string; accessibilityLabel: string };

const LOGO: NowPillModel = { kind: 'logo' };

export function nowPillModel(set: PillSet, now: number): NowPillModel {
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
      accessibilityLabel: `${artist.name} ${strings().setStatus.live} ${time}`,
    };
  }
  const time = formatRemaining(event.dateFrom - now, NARROW_SPACE);
  return {
    kind: 'break',
    artistName: artist.name,
    time,
    accessibilityLabel: `${artist.name} ${strings().setStatus.start} ${time}`,
  };
}
