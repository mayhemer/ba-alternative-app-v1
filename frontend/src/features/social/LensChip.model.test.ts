import { lensChipModel } from './LensChip.model';
import { colors } from '../../styling/tokens';

// ── The lens chip, configured ─────────────────────────────────────────────────
//
// Dimensions: the lens (everything; my picks, any level or Maybe; a friend);
// the panel closed or open.

describe('lensChipModel', () => {
  it('shows the grey empty star for everything', () => {
    expect(lensChipModel({ scope: { kind: 'all' }, friend: undefined, isOpen: false }).state)
      .toEqual({ kind: 'star', icon: 'star-outline', color: colors.notInterested });
  });

  it('shows the gold star for my picks, half when narrowed to Maybe', () => {
    expect(lensChipModel({ scope: { kind: 'me', level: null }, friend: undefined, isOpen: false }).state)
      .toEqual({ kind: 'star', icon: 'star', color: colors.accent });
    expect(lensChipModel({ scope: { kind: 'me', level: 'maybe' }, friend: undefined, isOpen: false }).state)
      .toEqual({ kind: 'star', icon: 'star-half', color: colors.accent });
  });

  it("shows the friend's avatar for a friend's picks", () => {
    expect(lensChipModel({ scope: { kind: 'friend', token: 't', level: null }, friend: { label: 'Anna' }, isOpen: false }).state)
      .toEqual({ kind: 'friend', label: 'Anna', avatarUrl: undefined });
  });

  it('turns the dots accent while the panel is open', () => {
    expect(lensChipModel({ scope: { kind: 'all' }, friend: undefined, isOpen: true }).dotsColor).toBe(colors.accent);
    expect(lensChipModel({ scope: { kind: 'all' }, friend: undefined, isOpen: false }).dotsColor).toBe(colors.textPrimary);
  });
});
