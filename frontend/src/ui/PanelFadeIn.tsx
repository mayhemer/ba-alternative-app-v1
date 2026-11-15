import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { OVERLAY_PANEL_FADE_IN_MS } from '../styling/tokens';

// ── A drop-down panel fading in ───────────────────────────────────────────────
//
// The lens and filter panels are mounted only while open; this fades one in
// over OVERLAY_PANEL_FADE_IN_MS, its backdrop, card and search field together,
// on the UI thread. It closes at once: no exit animation (an exit fade was
// suspected of breaking a timeline jump on iPhone, see search.md). It fills the
// panel's area and leaves every touch to the panel, which takes them while
// still fading. A pull's preview stays under it until it is in (ui/PullPreview).
//
// It plays with the system's reduce-motion setting on too (ReduceMotion.Never):
// Reanimated skips an entering animation there by default, which left a phone
// with the setting on showing no fade. A fade moves nothing, and iOS itself
// fades in place of motion with the setting on.

export const PANEL_FADE_IN = FadeIn.duration(OVERLAY_PANEL_FADE_IN_MS).reduceMotion(ReduceMotion.Never);

export function PanelFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <Animated.View testID="panel-fade-in" entering={PANEL_FADE_IN} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {children}
    </Animated.View>
  );
}
