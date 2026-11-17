import { useMemo, useRef } from 'react';
import { usePinchGesture, type PinchGesture } from 'react-native-gesture-handler';
import { pinchDirection, type PinchDirection } from './PinchStep.model';

// ── A pinch as steps, like a zoom ─────────────────────────────────────────────
//
// A pinch gesture, for a GestureDetector, that calls `onStep` each time its
// scale passes a threshold (PinchStep.model) measured from where the last step
// was taken (the pinch's start for the first): at once, while the fingers are
// down. So a pinch going on steps on, and one turning back steps back. One
// update steps once, however far it jumps; updates come every frame. Each step
// comes with the pinch's centre at that moment, in the coordinates of the view
// the detector wraps. Runs on the JS thread: a step changes React state,
// nothing animates.

export type PinchFocal = { x: number; y: number };

export function usePinchSteps(onStep: (direction: PinchDirection, focal: PinchFocal) => void, testID?: string): PinchGesture {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  // The scale at the last step, or at the pinch's start.
  const baseRef = useRef(1);

  const config = useMemo(() => ({
    testID,
    disableReanimated: true,
    runOnJS: true,
    onActivate: (): void => {
      baseRef.current = 1;
    },
    onUpdate: (event: { scale: number; focalX: number; focalY: number }): void => {
      const direction = pinchDirection(event.scale / baseRef.current);
      if (direction !== null) {
        baseRef.current = event.scale;
        onStepRef.current(direction, { x: event.focalX, y: event.focalY });
      }
    },
  }), [testID]);

  return usePinchGesture(config);
}
