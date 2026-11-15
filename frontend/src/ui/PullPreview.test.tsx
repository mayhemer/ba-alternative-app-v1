import React from 'react';
import { Platform, ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { usePullPastTop, type PullPreview } from './PullPreview';

// ── A pull down past a scroller's top ─────────────────────────────────────────
//
// On iOS the content follows the finger past its top, and a preview of the
// panel shows in the gap while the finger drags (PullPreview.model); from
// 84 pt it is armed, and letting go then opens the panel, once. On Android
// the platform's pull-to-refresh control does it, its spinner hidden, with no
// preview; web has no pull.
//
// Dimensions: the platform (iOS, Android: the suite runs once per preset, and
// each case runs on its own; web renders no .test.tsx, see jest.config.ts); the
// pull at release (under 84 pt, past it, past it and back under);
// a drag or a fling's bounce; the scroller's own scroll handlers.

type Handler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

let pulls = 0;
let previewRenders = 0;
const own = { onScroll: jest.fn(), onScrollBeginDrag: jest.fn(), onScrollEndDrag: jest.fn() };

const Preview: PullPreview = ({ armed }) => {
  previewRenders += 1;
  return <View testID="preview" accessibilityState={{ selected: armed }} />;
};

function Harness() {
  const { scrollProps, preview } = usePullPastTop(
    () => { pulls += 1; },
    { onScroll: own.onScroll as Handler, onScrollBeginDrag: own.onScrollBeginDrag as Handler, onScrollEndDrag: own.onScrollEndDrag as Handler, scrollEventThrottle: 100 },
    Preview,
  );
  return (
    <View>
      <ScrollView testID="scroller" {...scrollProps} />
      {preview}
    </View>
  );
}

/** A scroll event with the content at `y` (negative: pulled down past its top). */
function at(y: number) {
  return { nativeEvent: { contentOffset: { x: 0, y }, contentInset: { top: 0, left: 0, bottom: 0, right: 0 }, contentSize: { width: 390, height: 2000 }, layoutMeasurement: { width: 390, height: 700 } } };
}

const scroller = () => screen.getByTestId('scroller');
const beginDrag = async (y = 0) => { await act(async () => { fireEvent(scroller(), 'scrollBeginDrag', at(y)); }); };
const scrollTo = async (y: number) => { await act(async () => { fireEvent.scroll(scroller(), at(y)); }); };
const release = async (y: number) => { await act(async () => { fireEvent(scroller(), 'scrollEndDrag', at(y)); }); };

// The preview is hidden from screen readers, which queries skip unless asked.
const preview = () => screen.queryByTestId('preview', { includeHiddenElements: true });
const armed = () => preview()?.props.accessibilityState?.selected;

beforeEach(() => {
  pulls = 0;
  previewRenders = 0;
  jest.clearAllMocks();
});

const onIos = Platform.OS === 'ios' ? describe : describe.skip;
const onAndroid = Platform.OS === 'android' ? describe : describe.skip;

onIos('on iOS', () => {
  it('shows no preview before a drag', async () => {
    await render(<Harness />);
    expect(preview()).toBeNull();
  });

  it('shows the preview while the finger pulls, not armed before 84 pt', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-40);
    expect(preview()).not.toBeNull();
    expect(armed()).toBe(false);
    await scrollTo(-83);
    expect(armed()).toBe(false);
  });

  it('arms the preview at 84 pt, and does not open before the finger lets go', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-84);
    expect(armed()).toBe(true);
    expect(pulls).toBe(0);
  });

  it('opens once when let go armed, and the preview goes', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-90);
    await release(-90);
    expect(pulls).toBe(1);
    expect(preview()).toBeNull();
    // The content bouncing back after the release is not a pull.
    await scrollTo(-40);
    await scrollTo(0);
    expect(pulls).toBe(1);
    expect(preview()).toBeNull();
  });

  it('does not open when let go before 84 pt', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-70);
    await release(-70);
    expect(pulls).toBe(0);
    expect(preview()).toBeNull();
  });

  it('does not open when pulled past and back under before letting go', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-90);
    await scrollTo(-50);
    expect(armed()).toBe(false);
    await release(-50);
    expect(pulls).toBe(0);
  });

  it('opens from the release position alone, with no scroll event past 84 pt before it', async () => {
    await render(<Harness />);
    await beginDrag();
    await release(-90);
    expect(pulls).toBe(1);
  });

  it('shows nothing and opens nothing when a fling bounces past the top with no finger on it', async () => {
    await render(<Harness />);
    await scrollTo(-90);
    expect(preview()).toBeNull();
    await scrollTo(0);
    expect(pulls).toBe(0);
  });

  // It follows the finger without rendering: React renders it only when it
  // appears and when it arms or disarms.
  it('renders the preview when it appears and when it arms, not for every move', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-10);
    await scrollTo(-30);
    await scrollTo(-60);
    expect(previewRenders).toBe(1);
    await scrollTo(-90);
    await scrollTo(-120);
    expect(previewRenders).toBe(2);
  });

  it('passes every event on to the scroller\'s own handlers, and reports every frame', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-90);
    await release(-90);
    expect(own.onScrollBeginDrag).toHaveBeenCalledTimes(1);
    expect(own.onScroll).toHaveBeenCalledTimes(1);
    expect(own.onScrollEndDrag).toHaveBeenCalledTimes(1);
    expect(scroller().props.scrollEventThrottle).toBe(16);
    expect(scroller().props.refreshControl).toBeUndefined();
  });

  it('keeps the preview from screen readers and taps: it is a picture of the panel', async () => {
    await render(<Harness />);
    await beginDrag();
    await scrollTo(-40);
    const frame = screen.getByTestId('pull-preview', { includeHiddenElements: true });
    expect(frame.props.pointerEvents).toBe('none');
    expect(frame.props.accessibilityElementsHidden).toBe(true);
    expect(frame.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('bounces a list too short to scroll, so it can be pulled', async () => {
    await render(<Harness />);
    expect(scroller().props.alwaysBounceVertical).toBe(true);
  });
});

onAndroid('on Android', () => {
  it('opens through the platform\'s pull control, which opens on letting go, with no preview', async () => {
    await render(<Harness />);
    const control = scroller().props.refreshControl;
    expect(control.props.refreshing).toBe(false);
    expect(control.props.tintColor).toBe('transparent');
    await act(async () => { control.props.onRefresh(); });
    expect(pulls).toBe(1);
    expect(preview()).toBeNull();
  });

  it('leaves the scroller\'s own handlers and throttle as they are', async () => {
    await render(<Harness />);
    expect(scroller().props.scrollEventThrottle).toBe(100);
    await beginDrag();
    await scrollTo(-90);
    expect(own.onScroll).toHaveBeenCalledTimes(1);
    expect(preview()).toBeNull();
  });
});
