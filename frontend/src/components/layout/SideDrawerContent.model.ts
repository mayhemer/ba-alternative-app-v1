import { planStrings } from '../plan/planStrings';

// ── The navigation drawer: what it lists ──────────────────────────────────────
//
// My plan, the artists, the two timelines — each only when there are
// categories to build its lanes from for the artists it shows — and Settings;
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

const ITEMS = [
  { label: planStrings().title, screen: 'MyPlan' },
  { label: 'Artists', screen: 'ArtistList' },
  { label: 'Program', screen: 'Timeline' },
  { label: 'Support Program', screen: 'SupportTimeline' },
  { label: 'Settings', screen: 'Settings' },
];

export type DrawerInputs = {
  activeRoute: string | undefined;
  hasProgram: boolean;
  hasSupportProgram: boolean;
  conflictCount: number;
};

export function drawerItemModels({ activeRoute, hasProgram, hasSupportProgram, conflictCount }: DrawerInputs): DrawerItemModel[] {
  return ITEMS
    .filter((item) => {
      if (item.screen === 'Timeline') { return hasProgram; }
      if (item.screen === 'SupportTimeline') { return hasSupportProgram; }
      return true;
    })
    .map((item) => {
      const marker = item.screen === 'MyPlan' && conflictCount > 0 ? conflictCount : null;
      return {
        key: item.screen,
        label: item.label,
        active: item.screen === activeRoute,
        marker,
        accessibilityLabel: marker !== null ? `${item.label}, ${planStrings().conflictsLabel(marker)}` : item.label,
      };
    });
}
