import { starSelectorCapsule, starSelectorModel, touchesStar, STAR_SELECTOR_TIMEOUT_MS } from './StarSelector.model';
import { STAR_HIT_SLOP } from './StarButton.model';

// ── The star selector: what it shows and where ────────────────────────────────
//
// It opens beside the tapped star, apart from it: a capsule left of the star
// holding the four states, the current one ringed, and the state's name in a
// box above (below where there is no room above). The star stays uncovered.
// Positions are in window coordinates, from the star's measured frame. Nothing
// around it is dimmed, in the list or in the artist sheet.
//
// Dimensions:
//   - star size: the list row's small star, the artist sheet's large one;
//   - where the star is: mid-screen, or on the top row (no room above);
//   - the save: done, or failed.

const LIST_STAR = { x: 318, y: 200, width: 26, height: 30 }; // centre y 215
const SHEET_STAR = { x: 280, y: 120, width: 32, height: 38 }; // centre y 139
const TOP_LIMIT = 103; // a 47 pt status bar plus the 56 pt top bar

function model(overrides: Partial<Parameters<typeof starSelectorModel>[0]> = {}) {
  return starSelectorModel({
    frame: LIST_STAR,
    size: 'small',
    status: 'maybe',
    failed: false,
    topLimit: TOP_LIMIT,
    ...overrides,
  });
}

describe('starSelectorModel', () => {
  it('shows the four states in tap order, the current one marked', () => {
    expect(model().slots.map((s) => [s.status, s.current])).toEqual([
      ['none', false],
      ['maybe', true],
      ['will_go', false],
      ['dont_go', false],
    ]);
  });

  it('labels each state, and names the current one in the info text', () => {
    const m = model({ status: 'will_go' });

    expect(m.slots.map((s) => s.label)).toEqual(['Not marked', 'Maybe', 'Must see!', "Don't go"]);
    expect(m.info.label).toBe('Must see!');
  });

  it('sits left of a list star, apart from it, centred on it', () => {
    const m = model();

    // States start 6 pt in and end 6 pt before the capsule's right end.
    expect(m.capsule).toEqual({ left: 90, top: 191, width: 194, height: 48, radius: 24 });
    expect(m.slots.map((s) => s.left)).toEqual([6, 52, 98, 144]);
  });

  it('leaves 40 pt between the star and the nearest state', () => {
    const m = model();
    const nearest = m.slots[m.slots.length - 1];

    expect(LIST_STAR.x - (m.capsule.left + nearest.left + m.slotSize)).toBe(40);
  });

  it('leaves the star and its whole reach uncovered', () => {
    const { capsule } = model();

    expect(capsule.left + capsule.width).toBeLessThanOrEqual(LIST_STAR.x - STAR_HIT_SLOP.small);
  });

  it('draws the states at the list star\'s own size', () => {
    expect(model()).toMatchObject({ slotSize: 44, glyphSize: 26 });
  });

  it('draws the states at the sheet star\'s own, larger size', () => {
    const m = model({ frame: SHEET_STAR, size: 'large' });

    expect(m).toMatchObject({ slotSize: 48, glyphSize: 32 });
    expect(m.capsule).toEqual({ left: 36, top: 113, width: 210, height: 52, radius: 26 });
  });

  it('is fully rounded', () => {
    const { capsule } = model();

    expect(capsule.radius * 2).toBe(capsule.height);
  });

  it('puts the info text above the states, spanning them', () => {
    expect(model().info).toMatchObject({ side: 'above', y: 183, left: 96, width: 182 });
  });

  it('puts the info text below on the top row, where there is no room above', () => {
    // Centre 125: the capsule's top is at 101, under the 103 pt limit.
    const m = model({ frame: { ...LIST_STAR, y: 110 } });

    expect(m.info).toMatchObject({ side: 'below', y: 157 });
  });

  it('says when the save failed', () => {
    expect(model({ failed: true }).info.failed).toBe(true);
    expect(model().info.failed).toBe(false);
  });
});

describe('starSelectorCapsule', () => {
  it('is the capsule the model draws, in window coordinates', () => {
    expect(starSelectorCapsule(LIST_STAR, 'small')).toEqual({ left: 90, top: 191, width: 194, height: 48 });
  });
});

describe('touchesStar', () => {
  // The list star reaches 25 pt beyond its frame (318–344 × 200–230) on every side.
  it('counts a touch on the star', () => {
    expect(touchesStar(LIST_STAR, 'small', 331, 215)).toBe(true);
  });

  it('counts a touch within the star\'s reach', () => {
    expect(touchesStar(LIST_STAR, 'small', 294, 176)).toBe(true);
  });

  it('does not count a touch just beyond the reach', () => {
    expect(touchesStar(LIST_STAR, 'small', 292, 215)).toBe(false);
  });

  it('uses the sheet star\'s shorter reach', () => {
    // 5 pt around 280–312 × 120–158.
    expect(touchesStar(SHEET_STAR, 'large', 276, 139)).toBe(true);
    expect(touchesStar(SHEET_STAR, 'large', 274, 139)).toBe(false);
  });
});

it('closes 2.5 s after the last tap', () => {
  expect(STAR_SELECTOR_TIMEOUT_MS).toBe(2500);
});
