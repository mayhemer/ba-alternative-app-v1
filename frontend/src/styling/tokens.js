// Design tokens — single source of truth for all style values.
// Plain JS so it can be required by tailwind.config.js (which is not transpiled).
// TypeScript consumers import from tokens.ts, which re-exports these with types.

export const colors = {
  // ── Base palette ────────────────────────────────────────────────────────────
  background:    '#0a0a0a',
  surface:       '#141414',
  surfaceRaised: '#1a1a1a',   // subtle elevation above surface
  border:        '#2a2a2a',
  borderMid:     '#333333',   // slightly lighter border
  accent:        '#e8c84a',   // must-see / active
  amber:         '#b87a1a',   // maybe
  textPrimary:   '#f0f0f0',
  textSecondary: '#888888',
  textMuted:     '#666666',
  muted:         '#444444',   // tick marks, block default, subtle chrome
  rulerBorder:   '#222222',
  danger:        '#ff4444',   // now-line, errors, warnings
  black:         '#000000',
  white:         '#ffffff',
};
