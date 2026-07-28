import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  COMPACT_DIMENSION_BREAKPOINT,
  SHORT_VIEWPORT_BREAKPOINT,
} from '../styling/tokens';

// ── Layout mode ───────────────────────────────────────────────────────────────

export type LayoutMode = {
  /**
   * Roomy enough for desktop-style chrome: a permanent drawer, no hamburger, a
   * right-pinned lens panel. Tested against the *smaller* dimension so that a
   * landscape phone stays "narrow" — it is wide but short, and giving it a
   * permanent 260 pt drawer would eat a third of the screen. Also keeps an iPad
   * in a narrow Split View column on the compact layout.
   */
  isWide: boolean;
  /**
   * Vertical budget is tight — a phone in landscape, or a short desktop window.
   * Drives the TopBar collapse and drops the artist sheet's half-height snap.
   */
  isShort: boolean;
  /** Horizontal padding for centred content; 0 once there is width to spare. */
  contentPadding: number;
  width: number;
  height: number;
};

export function useLayoutMode(): LayoutMode {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isWide = Math.min(width, height) >= COMPACT_DIMENSION_BREAKPOINT;
    return {
      isWide,
      isShort: height < SHORT_VIEWPORT_BREAKPOINT,
      contentPadding: isWide ? 0 : 16,
      width,
      height,
    };
  }, [width, height]);
}
