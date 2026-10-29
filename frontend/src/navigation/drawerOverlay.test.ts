import type { NavigationAction } from '@react-navigation/native';

// ── Hamburger toggle ──────────────────────────────────────────────────────────
//
// The hamburger stays tappable while the drawer is open (the bars render above
// the navigator), so it toggles: open when closed, close when open. Opening
// closes the other exclusive overlays; closing leaves them alone.

type DrawerHistoryEntry = { type: 'drawer'; status: 'open' };

let mockDispatched: NavigationAction[];
let mockDrawerHistory: DrawerHistoryEntry[];

jest.mock('./navigationRef', () => ({
  navigationRef: {
    isReady: () => true,
    dispatch: (action: NavigationAction) => { mockDispatched.push(action); },
    getRootState: () => ({ history: [{ type: 'route', key: 'ArtistList' }, ...mockDrawerHistory] }),
  },
}));

type Modules = {
  drawer: typeof import('./drawerOverlay');
  hub: typeof import('../utils/overlayHub');
};

/** Fresh copies: the drawer joins the hub at module level. */
function load(): Modules {
  let modules!: Modules;
  jest.isolateModules(() => {
    modules = {
      hub: require('../utils/overlayHub'),
      drawer: require('./drawerOverlay'),
    };
  });
  return modules;
}

beforeEach(() => {
  mockDispatched = [];
  mockDrawerHistory = [];
});

describe('toggleDrawer', () => {
  it('opens a closed drawer and closes the other overlays', () => {
    const { drawer, hub } = load();
    const closeLens = jest.fn();
    hub.register({}, { close: closeLens });

    drawer.toggleDrawer();

    expect(mockDispatched).toEqual([{ type: 'OPEN_DRAWER' }]);
    expect(closeLens).toHaveBeenCalledTimes(1);
  });

  it('closes an open drawer and leaves the other overlays alone', () => {
    const { drawer, hub } = load();
    const closeLens = jest.fn();
    hub.register({}, { close: closeLens });
    mockDrawerHistory = [{ type: 'drawer', status: 'open' }];

    drawer.toggleDrawer();

    expect(mockDispatched).toEqual([{ type: 'CLOSE_DRAWER' }]);
    expect(closeLens).not.toHaveBeenCalled();
  });
});
