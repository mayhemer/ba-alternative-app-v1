import type { NavigationState } from '@react-navigation/native';

/**
 * The saved navigation state, or undefined when it names a route the navigator
 * no longer has. A release that renames or removes a screen (Conflicts → My
 * plan) leaves older installs holding such a state; restoring it would break
 * navigation, so the app starts from the navigator's default instead.
 */
export function sanitizeNavState(
  state: NavigationState | undefined,
  routeNames: readonly string[],
): NavigationState | undefined {
  if (state === undefined) {
    return undefined;
  }
  const known = new Set(routeNames);
  const allKnown = state.routes.every((route) => known.has(route.name))
    && (state.routeNames ?? []).every((name) => known.has(name));
  return allKnown ? state : undefined;
}
