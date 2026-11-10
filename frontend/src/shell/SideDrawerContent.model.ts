import { strings } from '../i18n/strings';

// ── The navigation drawer: what it lists ──────────────────────────────────────
//
// My plan, the artists, the two timelines — each only when there are
// categories to build its lanes from for the artists it shows, and My plan
// while either of them is listed — and Settings;
// the active one marked. My plan carries a warning sign with the number of
// clashing Must-sees (the shared conflict calculation's count), which its
// accessibility label reads out too.

export type DrawerItemModel = {
  /** The screen it opens. */
  key: string;
  label: string;
  active: boolean;
  /** The clash count beside My plan, or null. */
  marker: number | null;
  accessibilityLabel: string;
};

function items(): { label: string; screen: string }[] {
  const { screens } = strings();
  return [
    { label: screens.myPlan, screen: 'MyPlan' },
    { label: screens.artists, screen: 'ArtistList' },
    { label: screens.program, screen: 'Timeline' },
    { label: screens.supportProgram, screen: 'SupportTimeline' },
    { label: screens.settings, screen: 'Settings' },
  ];
}

export type DrawerInputs = {
  activeRoute: string | undefined;
  hasProgram: boolean;
  hasSupportProgram: boolean;
  conflictCount: number;
};

export function drawerItemModels({ activeRoute, hasProgram, hasSupportProgram, conflictCount }: DrawerInputs): DrawerItemModel[] {
  return items()
    .filter((item) => {
      if (item.screen === 'Timeline') { return hasProgram; }
      if (item.screen === 'SupportTimeline') { return hasSupportProgram; }
      if (item.screen === 'MyPlan') { return hasProgram || hasSupportProgram; }
      return true;
    })
    .map((item) => {
      const marker = item.screen === 'MyPlan' && conflictCount > 0 ? conflictCount : null;
      return {
        key: item.screen,
        label: item.label,
        active: item.screen === activeRoute,
        marker,
        accessibilityLabel: marker !== null ? `${item.label}, ${strings().conflict.conflictsLabel(marker)}` : item.label,
      };
    });
}
