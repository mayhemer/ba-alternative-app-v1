import { useSyncExternalStore } from 'react';
import { DrawerActions } from '@react-navigation/native';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { onOpening, register } from '../utils/overlayHub';

// The nav drawer's membership in the screen-exclusivity hub.
//
// It joins at module level rather than through useExclusiveOverlay because it is
// not a component we hold state for: it is toggled from one place (DrawerButton)
// and closed from another (the hub), so the two need a shared identity that
// outlives any single component. Registering once here also means the drawer can
// be closed before anything has rendered.

const DRAWER_ID = {};

type DrawerAction =
  | ReturnType<typeof DrawerActions.openDrawer>
  | ReturnType<typeof DrawerActions.closeDrawer>;

function dispatch(action: DrawerAction): void {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(action);
  }
}

register(DRAWER_ID, { close: () => { dispatch(DrawerActions.closeDrawer()); } });

function isDrawerOpen(): boolean {
  if (!navigationRef.isReady()) { return false; }
  // The drawer navigator is the container's root. With its default status
  // 'closed', an open drawer is a `drawer` entry in its history — the check
  // getDrawerStatusFromState makes, read here directly because importing
  // @react-navigation/drawer would load gesture-handler into every consumer.
  const state = navigationRef.getRootState() as DrawerNavigationState<ParamListBase>;
  return state.history.some((entry) => entry.type === 'drawer');
}

/** Calls `onChange` whenever the drawer may have opened or closed. */
function subscribe(onChange: () => void): () => void {
  // `ready` covers a state restored with the drawer open: the hamburger renders
  // above the navigator, before the container is ready.
  const offReady = navigationRef.addListener('ready', onChange);
  const offState = navigationRef.addListener('state', onChange);
  return () => {
    offReady();
    offState();
  };
}

/**
 * Whether the nav drawer is open, for components outside the navigator.
 * Re-renders only when that flips, not on every navigation state change.
 */
export function useIsDrawerOpen(): boolean {
  return useSyncExternalStore(subscribe, isDrawerOpen);
}

/**
 * The hamburger's action: close the nav drawer when it is open, otherwise open
 * it, closing any other exclusive overlay first. The hamburger stays tappable
 * while the drawer is open because both bars render above the navigator.
 */
export function toggleDrawer(): void {
  if (isDrawerOpen()) {
    dispatch(DrawerActions.closeDrawer());
    return;
  }
  onOpening(DRAWER_ID);
  dispatch(DrawerActions.openDrawer());
}
