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

// Below this height the vertical budget is tight enough to drop the TopBar
// entirely and float the BottomBar over the content instead.
export const SHORT_VIEWPORT_BREAKPOINT = 500;

// Height of the TopBar.
export const TOPBAR_HEIGHT = 56;

// Bottom padding scrollable content needs to clear the floating BottomBar on a
// short viewport. Deliberately a generous constant rather than the bar's
// measured height: it only has to be *at least* that, and a few extra px at the
// end of a scroll are invisible, whereas coupling the two would mean either
// pinning the bar to a fixed height (risking a clipped DaySwitcher) or plumbing
// an onLayout measurement through a context.
export const BOTTOM_OVERLAY_CLEARANCE = 76;

// Share of the viewport width the day-switch group may occupy when the BottomBar
// is a floating three-slot row; full width across an 844 pt landscape phone
// stretches the buttons out of proportion.
export const DAY_SWITCHER_MAX_FRACTION = 0.4;

// Gap between a floating overlay panel and the screen edges / the TopBar above it.
export const OVERLAY_PANEL_MARGIN = 10;
export const OVERLAY_PANEL_RADIUS = 14;

// Widest a floating overlay panel grows before it stops stretching and pins right.
export const OVERLAY_PANEL_MAX_WIDTH = 780;
