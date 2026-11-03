import {
  SEARCH_ENTRY_DOCK_HEIGHT,
  keyboardLift,
  scrollRefocusesField,
  searchDockFrame,
  searchEntryFrame,
  searchResultsBottomPadding,
} from './SearchDock.model';

// ── The search field at the bottom edge ───────────────────────────────────────
//
// Dimensions: the platform (iOS reports the keyboard from the screen's bottom
// edge, Android above the navigation bar); the keyboard up, down, or shorter
// than the safe area (a hardware keyboard's bar); a phone or a wide screen;
// where a scroll of the results started and where it came to rest.

describe('keyboardLift', () => {
  it('on iOS, is the keyboard less the safe area under the content, which it covers', () => {
    expect(keyboardLift({ platform: 'ios', keyboardHeight: 336, safeAreaBottom: 34 })).toBe(302);
  });

  it('on iOS, is nothing for a keyboard no taller than the safe area', () => {
    expect(keyboardLift({ platform: 'ios', keyboardHeight: 20, safeAreaBottom: 34 })).toBe(0);
    expect(keyboardLift({ platform: 'ios', keyboardHeight: 0, safeAreaBottom: 34 })).toBe(0);
  });

  it('on Android, is the keyboard as reported: its height already leaves out the navigation bar', () => {
    expect(keyboardLift({ platform: 'android', keyboardHeight: 280, safeAreaBottom: 48 })).toBe(280);
    expect(keyboardLift({ platform: 'android', keyboardHeight: 0, safeAreaBottom: 48 })).toBe(0);
  });
});

describe('searchDockFrame', () => {
  it('on a phone spans the width, inset like the panels, at the bottom edge, a pill', () => {
    expect(searchDockFrame({ isWide: false })).toEqual({ left: 10, right: 10, width: undefined, bottom: 10, height: 53, borderRadius: 26.5 });
  });

  it('on a wide screen is the panels\' column, pinned right', () => {
    expect(searchDockFrame({ isWide: true })).toEqual({ left: undefined, right: 10, width: 780, bottom: 10, height: 53, borderRadius: 26.5 });
  });
});

describe('searchEntryFrame', () => {
  it('is the open field\'s pill, higher by half its height, so it is not missed', () => {
    expect(searchEntryFrame({ isWide: false })).toEqual({ left: 10, right: 10, width: undefined, bottom: 37, height: 53, borderRadius: 26.5 });
  });

  it('on a wide screen keeps the panels\' column', () => {
    expect(searchEntryFrame({ isWide: true })).toEqual({ left: undefined, right: 10, width: 780, bottom: 37, height: 53, borderRadius: 26.5 });
  });

  it('leaves the panel card the area down to a margin above it', () => {
    expect(SEARCH_ENTRY_DOCK_HEIGHT).toBe(100);
  });
});

describe('searchResultsBottomPadding', () => {
  it('lets the last result scroll clear of the field, and of the keyboard under it', () => {
    expect(searchResultsBottomPadding(0)).toBe(89);
    expect(searchResultsBottomPadding(302)).toBe(391);
  });
});

describe('scrollRefocusesField', () => {
  it('gives the field the keyboard back when a scroll from below the top comes to rest at it', () => {
    expect(scrollRefocusesField({ from: 400, to: 0 })).toBe(true);
    expect(scrollRefocusesField({ from: 1, to: 0 })).toBe(true);
  });

  it('counts the bounce past the top as at it', () => {
    expect(scrollRefocusesField({ from: 400, to: -30 })).toBe(true);
  });

  it('not when the scroll stops short of the top', () => {
    expect(scrollRefocusesField({ from: 400, to: 2 })).toBe(false);
  });

  it('not when the scroll started at the top: that drag is the one that put the keyboard away', () => {
    expect(scrollRefocusesField({ from: 0, to: 0 })).toBe(false);
    expect(scrollRefocusesField({ from: 0, to: -40 })).toBe(false);
  });
});
