import type { LensScope } from '../../utils/interestUtils';
import type { InterestStatus } from '../../context/InterestContext';
import { STAR_CONFIG, type StarIconName } from '../StarButton.model';
import { colors } from '../../styling/tokens';

// ── The lens chip: what it shows ──────────────────────────────────────────────
//
// "State + menu": the state slot shows whose schedule is shown — the grey empty
// star for everything, the gold star for my picks (half when narrowed to
// Maybe), the friend's avatar with a full star for a friend — and the three
// dots turn accent while the lens panel is open.

export type LensChipModel = {
  key: 'lens-chip';
  state:
    | { kind: 'star'; icon: StarIconName; color: string }
    | { kind: 'friend'; label: string; avatarUrl?: string };
  dotsColor: string;
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
      : { kind: 'star', icon: star.icon, color: star.color },
    dotsColor: isOpen ? colors.accent : colors.textPrimary,
  };
}
