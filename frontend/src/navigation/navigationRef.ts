import { createNavigationContainerRef } from '@react-navigation/native';
import type { DrawerParamList } from './AppNavigator';

// Module-level ref passed to <NavigationContainer ref={...}>.
// Use this to navigate or dispatch actions from outside the navigator tree
// (e.g. TopBar, which renders above NavigationContainer).
export const navigationRef = createNavigationContainerRef<DrawerParamList>();
