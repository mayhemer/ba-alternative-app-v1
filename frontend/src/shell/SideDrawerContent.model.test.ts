import { drawerItemModels } from './SideDrawerContent.model';

// ── The navigation drawer, configured ─────────────────────────────────────────
//
// Dimensions: each timeline with or without categories; the active screen;
// the clash count, none or some.

const base = { activeRoute: 'ArtistList', hasProgram: true, hasSupportProgram: true, conflictCount: 0 };

describe('drawerItemModels', () => {
  it('lists My plan first, then the artists, the two timelines and Settings', () => {
    expect(drawerItemModels(base).map((i) => i.label)).toEqual(['My plan', 'Artists', 'Program', 'Support Program', 'Settings']);
  });

  it('leaves out a timeline without categories for its artists', () => {
    expect(drawerItemModels({ ...base, hasProgram: false }).map((i) => i.key)).toEqual(['MyPlan', 'ArtistList', 'SupportTimeline', 'Settings']);
    expect(drawerItemModels({ ...base, hasSupportProgram: false }).map((i) => i.key)).toEqual(['MyPlan', 'ArtistList', 'Timeline', 'Settings']);
  });

  it('marks the active screen only', () => {
    expect(drawerItemModels(base).filter((i) => i.active).map((i) => i.key)).toEqual(['ArtistList']);
  });

  it('carries no clash marker while nothing clashes', () => {
    expect(drawerItemModels(base).every((i) => i.marker === null)).toBe(true);
  });

  it('marks My plan with the clash count, and reads it out', () => {
    const [plan, ...others] = drawerItemModels({ ...base, conflictCount: 2 });
    expect([plan.marker, plan.accessibilityLabel]).toEqual([2, 'My plan, 2 conflicts']);
    expect(others.every((i) => i.marker === null)).toBe(true);
  });
});
