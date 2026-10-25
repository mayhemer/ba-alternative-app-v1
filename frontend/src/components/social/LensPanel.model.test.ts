import { lensPanelModel, type LensPanelInputs } from './LensPanel.model';

// ── The lens panel, configured ────────────────────────────────────────────────
//
// Dimensions: the lens; friends, none or two; a friend armed for removal;
// signed in or out; a share made or not.

const ANNA = { token: 'ta', label: 'Anna' };
const BEN = { token: 'tb', label: 'Ben', avatarUrl: 'https://x/b.jpg' };

function panel(overrides: Partial<LensPanelInputs> = {}) {
  return lensPanelModel({ scope: { kind: 'all' }, friends: [ANNA, BEN], pendingRemove: null, isLoggedIn: true, hasShare: false, ...overrides });
}

describe('the sources', () => {
  it('lists everything, my picks, then each friend', () => {
    expect(panel().rows.map((r) => r.label)).toEqual(['Everything', 'My picks', 'Anna', 'Ben']);
    expect(panel({ friends: [] }).rows.map((r) => r.label)).toEqual(['Everything', 'My picks']);
  });

  it('marks the active source only: everything, my picks, or one friend', () => {
    const active = (p: ReturnType<typeof panel>) => p.rows.filter((r) => r.active).map((r) => r.key);
    expect(active(panel())).toEqual(['all']);
    expect(active(panel({ scope: { kind: 'me', level: 'will_go' } }))).toEqual(['me']);
    expect(active(panel({ scope: { kind: 'friend', token: 'tb', level: null } }))).toEqual(['tb']);
  });

  it('shows what each row selects', () => {
    expect(panel().rows.map((r) => r.scope)).toEqual([
      { kind: 'all' },
      { kind: 'me', level: null },
      { kind: 'friend', token: 'ta', level: null },
      { kind: 'friend', token: 'tb', level: null },
    ]);
  });

  it('arms one friend\'s removal at a time', () => {
    expect(panel({ pendingRemove: 'tb' }).rows.map((r) => r.friend?.confirming ?? null)).toEqual([null, null, false, true]);
  });
});

describe('my schedule', () => {
  it('asks to sign in while signed out', () => {
    expect(panel({ isLoggedIn: false }).mySchedule).toEqual({ kind: 'signed-out' });
  });

  it('offers to share, then to share again with Copy and Revoke once shared', () => {
    expect(panel().mySchedule).toEqual({ kind: 'signed-in', shareLabel: 'Share my schedule', canCopyOrRevoke: false });
    expect(panel({ hasShare: true }).mySchedule).toEqual({ kind: 'signed-in', shareLabel: 'Share again', canCopyOrRevoke: true });
  });
});
