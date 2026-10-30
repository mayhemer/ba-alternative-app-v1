import { stripePath } from './stripes';

// ── 45° stripes as one SVG path ───────────────────────────────────────────────
//
// Dimensions: the direction (rising "/", the clash stripes; falling "\", a past
// row's) and the spacing (the clash stripes' default, or a given step). Each
// segment crosses the whole box height, starting a box-height left of x = 0 so
// the first stripes still reach the left edge.

describe('stripePath', () => {
  it('draws the clash stripes rising, bottom-left to top-right, by default', () => {
    // Default step: 2 · 2 · √2 = 5.66.
    expect(stripePath(10, 10)).toBe(
      'M-10.00,10 L0.00,0 M-4.34,10 L5.66,0 M1.31,10 L11.31,0 M6.97,10 L16.97,0 ',
    );
  });

  it('spaces the stripes by the step it is given', () => {
    expect(stripePath(20, 10, { step: 10 })).toBe('M-10.00,10 L0.00,0 M0.00,10 L10.00,0 M10.00,10 L20.00,0 ');
  });

  it('draws them falling, top-left to bottom-right, when asked', () => {
    expect(stripePath(20, 10, { step: 10, falling: true })).toBe('M-10.00,0 L0.00,10 M0.00,0 L10.00,10 M10.00,0 L20.00,10 ');
  });
});
