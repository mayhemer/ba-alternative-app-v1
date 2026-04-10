// Design tokens — single source of truth for all style values.
// Plain JS so it can be required by tailwind.config.js (which is not transpiled).
// TypeScript consumers import from tokens.ts, which re-exports these with types.

const colors = {
  // ── Base palette ────────────────────────────────────────────────────────────
  background:     '#0a0a0a',
  surface:        '#141414',
  surfaceRaised:  '#1a1a1a',   // subtle elevation above surface
  border:         '#2a2a2a',
  borderMid:      '#333333',   // slightly lighter border
  borderConflict: '#666666', 
  timeline: {
    blockDefault:       '#333333',
    categoryName:       '#777777',
    stripBg:            '#141414',
    laneBg:             '#141414',
    laneBorder:         '#444444',
    rulerBorder:        '#444444',
    rulerText:          '#c0c0c0',
  },
  notInterested:  '#888888',
  accent:         '#e8c84a',   // must-see / active
  amber:          '#b87a1a',   // warning
  textPrimary:    '#ffffff',
  textSecondary:  '#dddddd',
  textMuted:      '#bbbbbb',
  muted:          '#7f7f7f',   // tick marks, block default, subtle chrome
  danger:         '#ff4444',   // now-line, errors, warnings
  dangerSecondary:'#631a1a',   // now-line, errors, warnings
  black:          '#000000',
  white:          '#ffffff',
};

module.exports = { colors };
