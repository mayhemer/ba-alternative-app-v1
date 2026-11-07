// ── The overlay hub ───────────────────────────────────────────────────────────
//
// Exclusive members (drawer, panels, search) close each other: one opening
// closes every other. Close-only members (the detail sheets, the star selector)
// may sit over the others, so an opening leaves them alone; closeAll (a tap on
// the lock-screen now card) closes every member of both kinds.
//
// Dimensions: the member's kind (exclusive, close-only); the call (one opening,
// closeAll).

type Hub = typeof import('./overlayHub');

/** A fresh hub: the registry is module state. */
function load(): Hub {
  let hub!: Hub;
  jest.isolateModules(() => { hub = require('./overlayHub'); });
  return hub;
}

it('an opening member closes the other exclusive members, not itself', () => {
  const hub = load();
  const drawer = {};
  const closeDrawer = jest.fn();
  const closeLens = jest.fn();
  hub.register(drawer, { close: closeDrawer });
  hub.register({}, { close: closeLens });

  hub.onOpening(drawer);

  expect(closeDrawer).not.toHaveBeenCalled();
  expect(closeLens).toHaveBeenCalledTimes(1);
});

it('an opening member leaves the close-only members open', () => {
  const hub = load();
  const search = {};
  const closeSheet = jest.fn();
  hub.register(search, { close: jest.fn() });
  hub.register({}, { close: closeSheet, closeOnly: true });

  hub.onOpening(search);

  expect(closeSheet).not.toHaveBeenCalled();
});

it('closeAll closes every member, exclusive and close-only', () => {
  const hub = load();
  const closeSearch = jest.fn();
  const closeSheet = jest.fn();
  hub.register({}, { close: closeSearch });
  hub.register({}, { close: closeSheet, closeOnly: true });

  hub.closeAll();

  expect(closeSearch).toHaveBeenCalledTimes(1);
  expect(closeSheet).toHaveBeenCalledTimes(1);
});

it('a member that left is not closed', () => {
  const hub = load();
  const closeSheet = jest.fn();
  const leave = hub.register({}, { close: closeSheet, closeOnly: true });

  leave();
  hub.closeAll();

  expect(closeSheet).not.toHaveBeenCalled();
});
