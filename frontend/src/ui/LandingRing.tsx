import React, { useEffect } from 'react';
import { View } from 'react-native';
import { colors } from '../styling/tokens';

// ── The highlight on the element a jump landed on ─────────────────────────────
//
// A plain accent frame just outside the element: no tint, no animation. It ends
// its landing (`onEnd(token)`) `holdMs` after it was put on screen, so a slow
// screen switch or day mount cannot cut it short, and is then simply gone. Key
// it by the landing, so a new one starts over.
//
// No fade-out for now: with a Reanimated `exiting` fade here, on an iPhone a
// jump to the timeline from a sheet over My plan, made while My plan's frame
// still showed, landed on the right day but did not scroll to the set. Not
// reproduced on web; the fade is the suspect, unconfirmed.

export const LANDING_RING = {
  width: 3,
  /** How far outside the element the frame sits. */
  outset: 3,
  radius: 4,
  /** How long it shows, from when it is put on screen. */
  holdMs: 3000,
} as const;

type Props = {
  /** The landing it shows; handed back to `onEnd`. */
  token: number;
  onEnd: (token: number) => void;
  /** Padding of the parent left and right of the element, which the frame hugs instead. */
  horizontalInset?: number;
};

export function LandingRing({ token, onEnd, horizontalInset = 0 }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => { onEnd(token); }, LANDING_RING.holdMs);
    return () => { clearTimeout(timer); };
  }, [token, onEnd]);
  return (
    <View
      testID="landing-ring"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -LANDING_RING.outset,
        left: horizontalInset - LANDING_RING.outset,
        right: horizontalInset - LANDING_RING.outset,
        bottom: -LANDING_RING.outset,
        borderWidth: LANDING_RING.width,
        borderColor: colors.accent,
        borderRadius: LANDING_RING.radius,
        opacity: 1,
      }}
    />
  );
}
