import React from 'react';
import { Text } from './Text';
import { colors } from '../styling/tokens';

// ── A section's header in a drop-down panel ───────────────────────────────────
//
// Small, spaced capitals, as "Show" and "My schedule" in the lens panel.

export function PanelSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}
