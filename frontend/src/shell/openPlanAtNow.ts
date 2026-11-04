import { navigationRef } from '../navigation/navigationRef';

// ── My plan, today, scrolled to now ───────────────────────────────────────────
//
// What the now pill does off My plan, and what a tap on the lock-screen now
// card does: one step, so the two always land the same way. Navigation must be
// ready (navigationRef.isReady()).

export function openPlanAtNow(store: { requestNow: () => void }): void {
  store.requestNow();
  navigationRef.navigate('MyPlan');
}
