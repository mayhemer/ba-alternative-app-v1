import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// ── The Android card's layouts use only views a notification can draw ────────
//
// The card is drawn by the system (RemoteViews), which inflates only the view
// classes Android marks as remotable. Any other element, even a plain <View>,
// makes the inflation fail, and Android then silently removes the whole
// notification. Nothing compiles or runs these layouts on CI, so this test is
// the only guard.

// The remotable classes up to Android 9 (API 28), plus layout includes.
const ALLOWED = new Set([
  'AdapterViewFlipper',
  'AnalogClock',
  'Button',
  'Chronometer',
  'FrameLayout',
  'GridLayout',
  'GridView',
  'ImageButton',
  'ImageView',
  'LinearLayout',
  'ListView',
  'ProgressBar',
  'RelativeLayout',
  'StackView',
  'TextClock',
  'TextView',
  'ViewFlipper',
  'ViewStub',
  'include',
]);

const layoutDir = join(__dirname, 'android', 'src', 'main', 'res', 'layout');

function elementsOf(xml: string): string[] {
  const withoutComments = xml.replace(/<!--[\s\S]*?-->/g, '');
  return [...withoutComments.matchAll(/<([A-Za-z][\w.]*)/g)].map((m) => m[1]);
}

describe.each(readdirSync(layoutDir).filter((f) => f.endsWith('.xml')))('%s', (file) => {
  it('uses only views a notification can draw', () => {
    const elements = elementsOf(readFileSync(join(layoutDir, file), 'utf8'));
    expect(elements.filter((e) => !ALLOWED.has(e))).toEqual([]);
  });
});
