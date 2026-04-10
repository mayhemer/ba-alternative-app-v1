// Design tokens — TypeScript entry point for all style values.
// Values live in tokens.js so tailwind.config.js can require() them without
// a TypeScript transpilation step. TypeScript infers the shape via allowJs.

import { colors as imported_colors } from './tokens.js';

export const colors = { ...imported_colors } as any;
export type ColorToken = keyof typeof colors;

export const WIDE_SCREEN_WIDTH_BREAKPOINT = 800;
export const MAX_CONTENT_WIDTH = 700;
export const PADDING_BREAKPOINT = 732;
export const HIT_SLOP = 40;
