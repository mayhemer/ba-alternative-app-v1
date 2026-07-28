import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  BOTTOM_OVERLAY_CLEARANCE,
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
   * The TopBar is dropped and the BottomBar floats over the content.
   */
  isShort: boolean;
  /** Horizontal padding for centred content; 0 once there is width to spare. */
  contentPadding: number;
  /**
   * Bottom padding a screen's scrollable content needs so its last row clears
   * the floating BottomBar. 0 when the bar is in-flow and takes its own space.
   */
  bottomClearance: number;
  width: number;
  height: number;
};

export function useLayoutMode(): LayoutMode {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isWide = Math.min(width, height) >= COMPACT_DIMENSION_BREAKPOINT;
    const isShort = height < SHORT_VIEWPORT_BREAKPOINT;
    return {
      isWide,
      isShort,
      contentPadding: isWide ? 0 : 16,
      bottomClearance: isShort ? BOTTOM_OVERLAY_CLEARANCE : 0,
      width,
      height,
    };
  }, [width, height]);
}
