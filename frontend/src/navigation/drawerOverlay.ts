import { DrawerActions } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import { onOpening, register } from '../utils/overlayHub';

// The nav drawer's membership in the screen-exclusivity hub.
//
// It joins at module level rather than through useExclusiveOverlay because it is
// not a component we hold state for: it is opened from one place (DrawerButton)
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

/** Open the nav drawer, closing any other exclusive overlay first. */
export function openDrawer(): void {
  onOpening(DRAWER_ID);
  dispatch(DrawerActions.openDrawer());
}
