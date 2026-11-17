import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  Animated,
  Platform,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { isArmed, previewPosition, PULL_PAST_TOP_ENABLED } from './PullPreview.model';
import { OVERLAY_PANEL_FADE_IN_MS } from '../styling/tokens';

// ── A pull down past a scroller's top, as one action ──────────────────────────
//
// usePullPastTop wires a scroller so that pulling its content down past the top
// and letting go runs `onPull` (a screen opens its panel with it), and returns
// the preview to draw over the scroller's top edge.
//
// Switched off on every platform (PULL_PAST_TOP_ENABLED): the scroller keeps
// its own handlers and nothing is drawn. What follows is the pull when on.
//
// - iOS: the content follows the finger past its top (the scroller bounces).
//   While the finger drags, a preview of the panel (the screen's skeleton of it)
//   shows in the gap above the content: it comes down with the content's edge,
//   then stays where the panel opens while a longer pull uncovers more of it.
//   From PULL_ARM_DISTANCE it is armed, and letting go then runs `onPull`
//   (PullPreview.model); the preview stays where it stands until the panel
//   has faded in over it (OVERLAY_PANEL_FADE_IN_MS, ui/PanelFadeIn), so the
//   one turns into the other. Let go before, it goes at once. A fling bouncing
//   off the top, with no finger on it, shows nothing.
// - Android: no pull. The content does not move past its top, so there is no
//   gap to draw a preview in, and the platform's pull-to-refresh control (tried
//   for the gesture) draws its own indicator, which could not be hidden on a
//   dark theme.
// - Web: no pull (react-native-web has no gesture for it, and wraps a scroller
//   given a control in an extra view).

type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

/** The scroller's own scroll handling, which the pull wraps. */
export type OwnScrollProps = {
  onScroll?: ScrollHandler;
  onScrollBeginDrag?: ScrollHandler;
  onScrollEndDrag?: ScrollHandler;
  scrollEventThrottle?: number;
};

export type PullScrollProps = OwnScrollProps & {
  alwaysBounceVertical?: boolean;
};

/**
 * What a pull shows on iOS: a skeleton of the panel it opens, drawn where the
 * panel opens (its top at the scroller's top edge); `armed` once letting go opens.
 */
export type PullPreview = React.ComponentType<{ armed: boolean }>;

/** Taller than any panel's preview: the gap's cut moves within it. */
const WINDOW = 1000;

/** iOS only, while switched on. */
const HAS_PULL = PULL_PAST_TOP_ENABLED && Platform.OS === 'ios';

/** A scroll event per frame, so the preview follows the finger. */
const FRAME_THROTTLE = 16;

// ── The pull's state, outside React ───────────────────────────────────────────
//
// The scroller's handlers write it, and only the preview reads it, so the
// screen around the scroller never renders for a pull. Where the preview stands
// moves every frame, through Animated values; what React renders changes only
// when the preview appears, arms, disarms or goes.

type PullState = { shown: boolean; armed: boolean };

const NOT_PULLED: PullState = { shown: false, armed: false };
const PULLING: PullState = { shown: true, armed: false };
const ARMED: PullState = { shown: true, armed: true };

type PullStore = {
  get: () => PullState;
  subscribe: (listener: () => void) => () => void;
  set: (state: PullState) => void;
};

function createPullStore(): PullStore {
  let state = NOT_PULLED;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    set: (next) => {
      if (next === state) {
        return;
      }
      state = next;
      listeners.forEach((listener) => { listener(); });
    },
  };
}

/** How far the content is pulled down past its top, in pt. */
function pullOf(e: NativeSyntheticEvent<NativeScrollEvent>): number {
  const { contentOffset, contentInset } = e.nativeEvent;
  return -(contentOffset.y + (contentInset?.top ?? 0));
}

/** Moved every frame, by transforms only, so following the finger lays nothing out. */
type Motion = { cut: Animated.Value; content: Animated.Value };

function createMotion(): Motion {
  const { reveal, offset } = previewPosition(0);
  return { cut: new Animated.Value(reveal - WINDOW), content: new Animated.Value(WINDOW - reveal + offset) };
}

type PreviewProps = { store: PullStore; motion: Motion; Preview: PullPreview };

/**
 * The preview in the gap: a frame from the top edge (nothing above it, over the
 * top bar), a cut whose bottom is the content's edge, and in it the preview at
 * its offset. Nothing while not pulled; a picture, so no taps and no screen reader.
 */
function PullPreviewView({ store, motion, Preview }: PreviewProps) {
  const { shown, armed } = useSyncExternalStore(store.subscribe, store.get);
  if (!shown) {
    return null;
  }
  return (
    <View
      testID="pull-preview"
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: WINDOW, overflow: 'hidden' }}
    >
      <Animated.View style={{ height: WINDOW, overflow: 'hidden', transform: [{ translateY: motion.cut }] }}>
        <Animated.View style={{ transform: [{ translateY: motion.content }] }}>
          <Preview armed={armed} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/**
 * Spread `scrollProps` on the scroller in place of its own scroll handlers,
 * which it calls on, and draw `preview` over the scroller, in a view whose top
 * is the scroller's top. `onPull` runs once per pull, on letting go.
 */
export function usePullPastTop(
  onPull: () => void,
  own: OwnScrollProps,
  Preview: PullPreview,
): { scrollProps: PullScrollProps; preview: React.ReactElement | null } {
  const [store] = useState(createPullStore);
  const [motion] = useState(createMotion);
  // Set while a finger drags, cleared when it lets go: the bounce back, or a
  // fling's bounce off the top, is not a pull.
  const draggingRef = useRef(false);
  // Takes the preview away once the panel opened by the pull has faded in.
  const handoffRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (handoffRef.current !== null) { clearTimeout(handoffRef.current); }
  }, []);
  const { onScroll, onScrollBeginDrag, onScrollEndDrag, scrollEventThrottle } = own;

  const scrollProps = useMemo((): PullScrollProps => {
    const passed = { onScroll, onScrollBeginDrag, onScrollEndDrag, scrollEventThrottle };
    if (!HAS_PULL) {
      return passed;
    }
    const follow = (pull: number): void => {
      const { reveal, offset } = previewPosition(pull);
      motion.cut.setValue(reveal - WINDOW);
      motion.content.setValue(WINDOW - reveal + offset);
      store.set(isArmed(pull) ? ARMED : PULLING);
    };
    return {
      alwaysBounceVertical: true,
      scrollEventThrottle: Math.min(scrollEventThrottle ?? FRAME_THROTTLE, FRAME_THROTTLE),
      onScrollBeginDrag: (e) => {
        if (handoffRef.current !== null) {
          clearTimeout(handoffRef.current);
          handoffRef.current = null;
        }
        draggingRef.current = true;
        follow(pullOf(e));
        onScrollBeginDrag?.(e);
      },
      onScroll: (e) => {
        if (draggingRef.current) {
          follow(pullOf(e));
        }
        onScroll?.(e);
      },
      onScrollEndDrag: (e) => {
        // What the preview showed last, or where the finger let go: armed means it opens.
        const armed = store.get().armed || isArmed(pullOf(e));
        draggingRef.current = false;
        onScrollEndDrag?.(e);
        if (!armed) {
          store.set(NOT_PULLED);
          return;
        }
        // Stands still under the panel fading in, then goes.
        store.set(ARMED);
        handoffRef.current = setTimeout(() => {
          handoffRef.current = null;
          store.set(NOT_PULLED);
        }, OVERLAY_PANEL_FADE_IN_MS);
        onPull();
      },
    };
  }, [onPull, onScroll, onScrollBeginDrag, onScrollEndDrag, scrollEventThrottle, store, motion]);

  const previewElement = useMemo(
    () => (HAS_PULL ? <PullPreviewView store={store} motion={motion} Preview={Preview} /> : null),
    [store, motion, Preview],
  );

  return { scrollProps, preview: previewElement };
}
