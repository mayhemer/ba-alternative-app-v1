import { categoryBlockColors } from './color';

// ── A category's colours ──────────────────────────────────────────────────────
//
// The timeline's blocks and My plan's rows take them from the category's own
// colour: a dark background, a brighter border, and a dimmer background. All
// three solid. The dimensions: a strong colour, white (the source's "no
// colour"), and black.

describe('categoryBlockColors', () => {
  it('scales a strong colour down to a dark background, a brighter border and a dimmer background', () => {
    expect(categoryBlockColors('rgb(222, 25, 81)')).toEqual({
      bg: 'rgb(72, 35, 45)',
      border: 'rgb(141, 43, 71)',
      dimBg: 'rgb(44, 32, 35)',
    });
  });

  it('gives white its brightest grey', () => {
    expect(categoryBlockColors('rgb(255, 255, 255)')).toEqual({
      bg: 'rgb(78, 78, 78)',
      border: 'rgb(158, 158, 158)',
      dimBg: 'rgb(46, 46, 46)',
    });
  });

  it('keeps black at the floor', () => {
    expect(categoryBlockColors('rgb(0, 0, 0)')).toEqual({
      bg: 'rgb(30, 30, 30)',
      border: 'rgb(30, 30, 30)',
      dimBg: 'rgb(30, 30, 30)',
    });
  });
});
