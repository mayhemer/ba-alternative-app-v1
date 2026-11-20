import { pinchDirection } from './PinchStep.model';

// ── When a pinch counts as one step, and which way ────────────────────────────
//
// Dimension: the pinch's scale, around both thresholds (0.71 in, 1.41 out) and
// at rest (1).

describe('pinchDirection', () => {
  it.each([
    [1, null],
    [0.8, null],
    [0.72, null],
    [0.71, 'in'],
    [0.5, 'in'],
    [1.25, null],
    [1.4, null],
    [1.41, 'out'],
    [2, 'out'],
  ] as const)('scale %p → %p', (scale, expected) => {
    expect(pinchDirection(scale)).toBe(expected);
  });
});
