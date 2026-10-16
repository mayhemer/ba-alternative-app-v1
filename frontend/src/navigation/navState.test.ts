import type { NavigationState } from '@react-navigation/native';
import { sanitizeNavState } from './navState';

// ── Restoring the saved navigation state ──────────────────────────────────────
//
// The navigator's state is saved on every change and restored at launch. A
// release that renames or removes a screen (Conflicts → My plan) leaves older
// installs with a saved state naming a route that no longer exists; restoring it
// must fall back to the navigator's default instead of breaking navigation.

const ROUTES = ['MyPlan', 'ArtistList', 'Timeline', 'SupportTimeline', 'Settings'] as const;

function drawerState(names: string[], index: number): NavigationState {
  return {
    key: 'drawer',
    index,
    routeNames: names,
    routes: names.map((name) => ({ key: `${name}-key`, name })),
    type: 'drawer',
    stale: false,
    history: [],
  } as unknown as NavigationState;
}

it('keeps a state whose routes all still exist', () => {
  const state = drawerState(['ArtistList', 'Timeline', 'MyPlan'], 2);
  expect(sanitizeNavState(state, ROUTES)).toBe(state);
});

it('drops a state that names a route which no longer exists', () => {
  const state = drawerState(['ArtistList', 'Timeline', 'Conflicts'], 2);
  expect(sanitizeNavState(state, ROUTES)).toBeUndefined();
});

it('drops it even when the unknown route is not the active one', () => {
  const state = drawerState(['ArtistList', 'Conflicts'], 0);
  expect(sanitizeNavState(state, ROUTES)).toBeUndefined();
});

it('passes "nothing saved" through', () => {
  expect(sanitizeNavState(undefined, ROUTES)).toBeUndefined();
});
