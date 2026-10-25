import type { InterestStatus } from '../context/InterestContext';
import { colors } from '../styling/tokens';

// ── The interest star: what it shows ──────────────────────────────────────────
//
// One table for every place a pick is drawn — the star button, the indicator
// beside names, the toast's cycle strip, the filter controls: each status's
// icon, colour, strike-through and feedback label. And the star button's size
// and reach, which the toast keeps clear of.

export type StarIconName = 'star' | 'star-half' | 'star-outline';

type StarConfig = {
  icon: StarIconName;
  color: string;
  /** Drawn with a diagonal bar across it. */
  struck: boolean;
  feedbackLabel: string;
};

export const STAR_CONFIG: Record<InterestStatus, StarConfig> = {
  none:     { icon: 'star-outline', color: colors.notInterested,   struck: false, feedbackLabel: 'Not marked' },
  maybe:    { icon: 'star-half',    color: colors.accent,          struck: false, feedbackLabel: 'Maybe'      },
  will_go:  { icon: 'star',         color: colors.accent,          struck: false, feedbackLabel: 'Must see!'  },
  dont_go:  { icon: 'star-outline', color: colors.dangerSecondary, struck: true,  feedbackLabel: "Don't go"   },
};

export type StarStrike = { left: number; top: number; length: number; thickness: number };

export type StarGlyphModel = {
  icon: StarIconName;
  color: string;
  size: number;
  /** The bar across a "don't go" star, placed on the size × size square the glyph is drawn in. */
  strike: StarStrike | null;
};

/** A status's star at `size`; `color` overrides the status colour, shape only. */
export function starGlyphModel(status: InterestStatus, size: number, color?: string): StarGlyphModel {
  const config = STAR_CONFIG[status];
  if (!config.struck) {
    return { icon: config.icon, color: color ?? config.color, size, strike: null };
  }
  const length = Math.round(size * 1.1);
  const thickness = Math.max(2, Math.round(size * 0.08));
  return {
    icon: config.icon,
    color: color ?? config.color,
    size,
    strike: { left: (size - length) / 2, top: (size - thickness) / 2, length, thickness },
  };
}

export function getFeedbackLabel(status: InterestStatus): string {
  return STAR_CONFIG[status].feedbackLabel;
}

export const STAR_ICON_SIZE = { small: 26, large: 32 } as const;
export const STAR_HIT_SLOP  = { small: 25, large: 5 } as const;

/**
 * How far from the right edge of the content column a star button (with its
 * hit slop) can reach. Overlays that must never cover a star keep out of it.
 *   artist row:    pr-4 (16) + small icon + slop                        = 67
 *   detail header: contentPadding (16) + large icon + slop + web ✕ (30) = 83
 */
export const STAR_COLUMN_RESERVE = Math.max(
  16 + STAR_ICON_SIZE.small + STAR_HIT_SLOP.small,
  16 + STAR_ICON_SIZE.large + STAR_HIT_SLOP.large + 30,
);
