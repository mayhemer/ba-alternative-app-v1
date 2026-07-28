// Design tokens — TypeScript entry point for all style values.
// Values live in tokens.js so tailwind.config.js can require() them without
// a TypeScript transpilation step. TypeScript infers the shape via allowJs.

import { colors as imported_colors } from './tokens.js';

export const colors = { ...imported_colors } as any;
export type ColorToken = keyof typeof colors;

export const MAX_CONTENT_WIDTH = 700;

// ── Layout mode breakpoints ───────────────────────────────────────────────────
// Both are tested against a *dimension*, never against width alone: a landscape
// phone is wide (844 pt) but not roomy, and treating it as a desktop gives it a
// permanent drawer and zero horizontal padding.

// A viewport counts as "wide" only when its *smaller* dimension clears this —
// true for tablets and desktop windows, false for a phone in either orientation.
export const COMPACT_DIMENSION_BREAKPOINT = 600;

// Below this height the vertical budget is tight enough that the TopBar collapses
// on scroll and the artist sheet stops offering its half-height presentation.
export const SHORT_VIEWPORT_BREAKPOINT = 500;

// Height of the TopBar. It is laid out as an overlay above the screen content,
// so this doubles as the content area's top padding and the collapse distance.
export const TOPBAR_HEIGHT = 56;

// Gap between a floating overlay panel and the screen edges / the TopBar above it.
export const OVERLAY_PANEL_MARGIN = 10;
export const OVERLAY_PANEL_RADIUS = 14;

// Widest a floating overlay panel grows before it stops stretching and pins right.
export const OVERLAY_PANEL_MAX_WIDTH = 780;
