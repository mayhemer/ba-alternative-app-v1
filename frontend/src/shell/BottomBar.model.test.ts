import { bottomBarInSight, bottomBarMode } from './BottomBar.model';

// ── How the bottom bar is shown ───────────────────────────────────────────────

describe('bottomBarMode', () => {
  it('is a row under a screen that has content for it, and nothing under one that does not', () => {
    expect(bottomBarMode({ hasContent: true, isShort: false })).toBe('row');
    expect(bottomBarMode({ hasContent: false, isShort: false })).toBe('hidden');
  });

  it('floats on a short viewport, with content or without: it carries the TopBar\'s controls', () => {
    expect(bottomBarMode({ hasContent: true, isShort: true })).toBe('floating');
    expect(bottomBarMode({ hasContent: false, isShort: true })).toBe('floating');
  });
});

describe('bottomBarInSight', () => {
  it('is in sight while nothing holds the bottom edge', () => {
    expect(bottomBarInSight({ searchOpen: false, lensPanelOpen: false, planPanelOpen: false })).toBe(true);
  });

  it('gives the bottom edge to the search field while the search or either panel is open', () => {
    expect(bottomBarInSight({ searchOpen: true, lensPanelOpen: false, planPanelOpen: false })).toBe(false);
    expect(bottomBarInSight({ searchOpen: false, lensPanelOpen: true, planPanelOpen: false })).toBe(false);
    expect(bottomBarInSight({ searchOpen: false, lensPanelOpen: false, planPanelOpen: true })).toBe(false);
  });
});
