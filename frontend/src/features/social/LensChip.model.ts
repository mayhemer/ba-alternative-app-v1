import type { LensScope } from '../../lib/interestUtils';
import type { InterestStatus } from '../interests/InterestContext';
import { STAR_CONFIG, type StarIconName } from '../interests/StarButton.model';
import { colors } from '../../styling/tokens';
import { TOPBAR_BUTTON_OPEN_CONTENT } from '../../ui/topBarButton';

// ── The lens chip: what it shows ──────────────────────────────────────────────
//
// "State + menu": the state slot shows whose schedule is shown — the grey empty
// star for everything, the gold star for my picks (half when narrowed to
// Maybe), the friend's avatar with a full star for a friend. While the lens
// panel is open the chip is drawn open (ui/topBarButton): the star and the dots
// black on the accent; a friend's avatar stays as it is.

export type LensChipModel = {
  key: 'lens-chip';
  state:
    | { kind: 'star'; icon: StarIconName; color: string }
    | { kind: 'friend'; label: string; avatarUrl?: string };
  dotsColor: string;
  /** The panel is open: drawn on the open background. */
  open: boolean;
};

// A non-friend scope in the star vocabulary shared with the artist rows.
function scopeStarStatus(scope: LensScope): InterestStatus {
  if (scope.kind === 'all') { return 'none'; }
  if (scope.level === 'maybe') { return 'maybe'; }
  return 'will_go';
}

export function lensChipModel({ scope, friend, isOpen }: { scope: LensScope; friend: { label: string; avatarUrl?: string } | undefined; isOpen: boolean }): LensChipModel {
  const star = STAR_CONFIG[scopeStarStatus(scope)];
  return {
    key: 'lens-chip',
    state: friend !== undefined
      ? { kind: 'friend', label: friend.label, avatarUrl: friend.avatarUrl }
      : { kind: 'star', icon: star.icon, color: isOpen ? TOPBAR_BUTTON_OPEN_CONTENT : star.color },
    dotsColor: isOpen ? TOPBAR_BUTTON_OPEN_CONTENT : colors.textPrimary,
    open: isOpen,
  };
}
