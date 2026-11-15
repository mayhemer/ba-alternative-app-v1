import React from 'react';
import { Text } from './Text';
import { colors } from '../styling/tokens';

// ── A section's header in a drop-down panel ───────────────────────────────────
//
// Small, spaced capitals, as "Show" and "My schedule" in the lens panel. Given
// `skeletonColor`, drawn in it, for a panel's preview (a mock of the panel).

const TEXT_STYLE = {
  color: colors.textSecondary,
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase' as const,
};
const BOX_STYLE = { marginBottom: 6, marginTop: 4 };
const LABEL_STYLE = [TEXT_STYLE, BOX_STYLE];

export function PanelSectionLabel({ children, skeletonColor }: { children: string; skeletonColor?: string }) {
  const style = skeletonColor === undefined ? LABEL_STYLE : [TEXT_STYLE, BOX_STYLE, { color: skeletonColor }];
  return <Text style={style}>{children}</Text>;
}
