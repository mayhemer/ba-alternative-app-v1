import { navigationRef } from '../navigation/navigationRef';

// ── My plan, today, scrolled to now ───────────────────────────────────────────
//
// What a tap on the now pill does, on any screen, and what a tap on the
// lock-screen now card does: one step, so the two always land the same way.
// Navigation must be ready (navigationRef.isReady()).

export function openPlanAtNow(store: { requestNow: () => void }): void {
  store.requestNow();
  navigationRef.navigate('MyPlan');
}
