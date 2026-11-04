import type { PillSet } from '../lib/nowPillSet';
import { formatRemaining, NARROW_SPACE, planStrings } from '../screens/my-plan/planStrings';
import { timelineJump, type TimelineJump } from '../lib/timelineJump';
import type { DbEvent } from '../types/backend';

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
// too) picks the set the pill names; nowPillTarget hands the same set to a tap on
// My plan, which opens its timeline at now (see nowPillTap).

const strings = planStrings();

export type NowPillModel =
  | { kind: 'logo' }
  | { kind: 'live'; artistName: string; time: string; progress: number; more: number; accessibilityLabel: string }
  | { kind: 'break'; artistName: string; time: string; accessibilityLabel: string };

/** The set the pill names, and where it is on the timelines. */
export type NowPillTarget = { event: DbEvent; jump: TimelineJump };

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
export function nowPillTarget(set: PillSet): NowPillTarget | null {
  if (set === null) {
    return null;
  }
  return { event: set.must.event, jump: timelineJump(set.must.artist, set.must.event) };
}

// ── What a tap does ───────────────────────────────────────────────────────────
//
// The pill toggles between My plan and the timeline: on My plan showing today
// with now in view (planNowInView) a tap shows the pill's set's timeline at now;
// anywhere else, My plan scrolled away from now or showing another day
// included, it opens My plan on today at now. So on My plan a first tap brings
// now into view and the next one switches. The logo has no set and is not a
// button.

export type NowPillTap =
  | { kind: 'none' }
  | { kind: 'plan' }
  | { kind: 'timeline'; target: NowPillTarget };

/** Where My plan is: whether it shows today, and whether now is in its view (planNowInView). */
export type PlanAtTap = { showsToday: boolean; nowInView: boolean };

/** `activeRoute` is the drawer screen shown, undefined before navigation is ready. */
export function nowPillTap(activeRoute: string | undefined, target: NowPillTarget | null, plan: PlanAtTap): NowPillTap {
  if (target === null) {
    return { kind: 'none' };
  }
  if (activeRoute === 'MyPlan' && plan.showsToday && plan.nowInView) {
    return { kind: 'timeline', target };
  }
  return { kind: 'plan' };
}
