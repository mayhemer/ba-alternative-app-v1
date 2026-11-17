// Design tokens — TypeScript entry point for all style values.
// Values live in tokens.js so tailwind.config.js can require() them without
// a TypeScript transpilation step. TypeScript infers the shape via allowJs.

import { Platform, type TextStyle } from 'react-native';
import { colors as imported_colors } from './tokens.js';

export const colors = { ...imported_colors } as any;
export type ColorToken = keyof typeof colors;

export const MAX_CONTENT_WIDTH = 700;

/**
 * For a text field whose own frame marks focus (the search field, my note's
 * editor): no browser focus ring inside it. Chrome draws that ring with
 * outline-style auto, which ignores outline-width; React Native's types have no
 * 'none', which react-native-web passes through.
 */
export const NO_FOCUS_RING = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

// The drop shadow of what floats over the screen (the feedback toast, the star
// selector), plus a dark ring just outside its light border that keeps the edge
// clear over a bright artist photo. boxShadow draws the same on iOS, Android and web.
export const FLOATING_SHADOW = '0px 8px 24px rgba(0, 0, 0, 0.85), 0px 0px 0px 1px rgba(0, 0, 0, 0.6)';

// Single step-down applied to a label that will not fit its box at full size.
// The one scale every fitted label shares — see ui/textFit.
export const TEXT_SHRINK_SCALE = 0.8;

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
// How long the lens and filter panels take to fade in (ui/PanelFadeIn); they close at once.
export const OVERLAY_PANEL_FADE_IN_MS = 125;

// Behind the lens and filter panels and an empty search: the screen shows through
// at a fifth, so the panel and the search field at the bottom edge stand out.
export const OVERLAY_BACKDROP = 'rgba(0,0,0,0.8)';

// Widest a floating overlay panel grows before it stops stretching and pins right.
export const OVERLAY_PANEL_MAX_WIDTH = 780;
