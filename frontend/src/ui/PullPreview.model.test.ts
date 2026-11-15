import { isArmed, PULL_ARM_DISTANCE, previewPosition } from './PullPreview.model';

// ── The pull preview: where it stands, and when letting go opens ──────────────
//
// The preview of the panel stands in the gap the pull opens above the content.
// For the first 84 pt it comes down with the content's top edge; from there it
// stays where the panel opens, and a longer pull uncovers more of it. Letting
// go from 84 pt on opens the panel.
//
// Dimension: the pull (negative: scrolled below the top), around zero and 84 pt.

it('arms at 84 pt', () => {
  expect(PULL_ARM_DISTANCE).toBe(84);
  expect(isArmed(83.9)).toBe(false);
  expect(isArmed(84)).toBe(true);
  expect(isArmed(250)).toBe(true);
  expect(isArmed(-100)).toBe(false);
});

it('uncovers nothing while nothing is pulled, its top 84 pt above the edge', () => {
  expect(previewPosition(0)).toEqual({ reveal: 0, offset: -84 });
  expect(previewPosition(-40)).toEqual({ reveal: 0, offset: -84 });
});

it('comes down with the content\'s top edge, uncovering as much as the pull', () => {
  expect(previewPosition(30)).toEqual({ reveal: 30, offset: -54 });
  expect(previewPosition(83)).toEqual({ reveal: 83, offset: -1 });
});

it('stands where the panel opens from 84 pt, a longer pull uncovering more of it', () => {
  expect(previewPosition(84)).toEqual({ reveal: 84, offset: 0 });
  expect(previewPosition(200)).toEqual({ reveal: 200, offset: 0 });
});
