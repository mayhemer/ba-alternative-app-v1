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

  it('is drawn open while the panel is open: the star and the dots black', () => {
    expect(lensChipModel({ scope: { kind: 'all' }, friend: undefined, isOpen: true })).toEqual({
      key: 'lens-chip',
      state: { kind: 'star', icon: 'star-outline', color: colors.black },
      dotsColor: colors.black,
      open: true,
    });
    expect(lensChipModel({ scope: { kind: 'me', level: null }, friend: undefined, isOpen: true }).state)
      .toEqual({ kind: 'star', icon: 'star', color: colors.black });
  });

  it('is drawn closed, with white dots, while the panel is closed', () => {
    const closed = lensChipModel({ scope: { kind: 'all' }, friend: undefined, isOpen: false });
    expect(closed.dotsColor).toBe(colors.textPrimary);
    expect(closed.open).toBe(false);
  });

  it("keeps a friend's avatar as it is while the panel is open", () => {
    expect(lensChipModel({ scope: { kind: 'friend', token: 't', level: null }, friend: { label: 'Anna' }, isOpen: true }).state)
      .toEqual({ kind: 'friend', label: 'Anna', avatarUrl: undefined });
  });
});
