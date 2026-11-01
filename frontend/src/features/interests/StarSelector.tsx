import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../ui/Text';
import { StarGlyph } from './StarButton';
import { useInterest, type InterestStatus } from './InterestContext';
import { useOpenStarSelector, useStarSelectorActions, type OpenStarSelector } from './StarSelectorContext';
import {
  starSelectorModel,
  STAR_SELECTOR_DIMMED_STATE,
  STAR_SELECTOR_RING_MS,
  type StarSelectorModel,
} from './StarSelector.model';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { perfMark, perfMarksEnabled } from '../../utils/perfMarks';
import { colors, FLOATING_SHADOW, TOPBAR_HEIGHT } from '../../styling/tokens';

// ── The star selector ─────────────────────────────────────────────────────────
//
// Draws its model (StarSelector.model.ts) over everything, in window
// coordinates, beside the pressed star and apart from it. It says the press
// already did its job: the ring moves from the state before the press to the
// new one, and the name above carries a tick. Mounted once, in AppShell;
// renders nothing while closed.

/** The ring around the current state, inside its tap target. */
const RING_INSET = 3;
const RING_WIDTH = 2;
/**
 * The ring's move is the one motion that tells what the press did, so it runs
 * even with the system's reduce-motion setting on.
 */
const RING_TIMING = { duration: STAR_SELECTOR_RING_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never };

const INFO_BOX_STYLE = {
  backgroundColor: colors.infoSurface,
  borderRadius: 10,
  boxShadow: FLOATING_SHADOW,
  paddingHorizontal: 10,
  paddingVertical: 5,
  alignItems: 'center' as const,
};
const INFO_TEXT_STYLE = { fontSize: 13, fontWeight: '700' as const, color: colors.infoText };

export function StarSelector() {
  const open = useOpenStarSelector();
  if (open === null) { return null; }
  // A new opening is a new selector: its ring starts again from the state before.
  return <OpenSelector key={open.id} open={open} />;
}

function OpenSelector({ open }: { open: OpenStarSelector }) {
  const { getStatus } = useInterest();
  const { select, hold, release } = useStarSelectorActions();
  const insets = useSafeAreaInsets();
  const { height: windowHeight, isShort } = useLayoutMode();

  const status = getStatus(open.artistId);
  const model = starSelectorModel({
    frame: open.frame,
    size: open.size,
    status,
    failed: open.failed,
    topLimit: insets.top + (isShort ? 0 : TOPBAR_HEIGHT),
  });
  const { capsule, slotSize, slots } = model;

  // Positions inside the capsule are inside its 1 pt border.
  const slotTop = (capsule.height - slotSize) / 2 - 1;
  const ring = slotSize - 2 * RING_INSET;
  const ringOffset = (s: InterestStatus) => (slots.find((slot) => slot.status === s)?.left ?? 0) - slots[0].left;

  // The ring starts on the state before the press and moves to the new one at
  // once; after that it follows each change.
  const ringX = useSharedValue(ringOffset(open.from));
  const target = ringOffset(status);
  useEffect(() => {
    ringX.value = withTiming(target, RING_TIMING);
  }, [target, ringX]);
  const ringStyle = useAnimatedStyle(() => ({ transform: [{ translateX: ringX.value }] }));

  // Perf builds: the frame after this opening first drew. Only an effect sees a
  // committed opening; a mark in the render body would also fire for renders
  // React throws away.
  useEffect(() => {
    if (!perfMarksEnabled()) { return undefined; }
    const frame = requestAnimationFrame(() => { perfMark('star:shown'); });
    return () => { cancelAnimationFrame(frame); };
  }, []);

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View
        testID="star-selector"
        accessibilityLabel="Interest"
        // A finger on it holds it open; a touch on it is its own, so it never
        // reaches the row under it.
        onTouchStart={hold}
        onTouchEnd={release}
        onTouchCancel={release}
        onStartShouldSetResponder={() => true}
        style={{
          position: 'absolute',
          left: capsule.left,
          top: capsule.top,
          width: capsule.width,
          height: capsule.height,
          borderRadius: capsule.radius,
          backgroundColor: colors.toastSurface,
          borderWidth: 1,
          borderColor: colors.toastBorder,
          boxShadow: FLOATING_SHADOW,
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: slots[0].left - 1 + RING_INSET,
              top: slotTop + RING_INSET,
              width: ring,
              height: ring,
              borderRadius: ring / 2,
              borderWidth: RING_WIDTH,
              borderColor: colors.toastHighlight,
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            },
            ringStyle,
          ]}
        />

        {slots.map((slot) => (
          <Pressable
            key={slot.status}
            onPress={() => select(slot.status)}
            accessibilityRole="button"
            accessibilityLabel={slot.label}
            accessibilityState={{ selected: slot.current }}
            style={{ position: 'absolute', left: slot.left - 1, top: slotTop, width: slotSize, height: slotSize, alignItems: 'center', justifyContent: 'center' }}
          >
            <View
              testID={`star-selector-glyph-${slot.status}`}
              style={{ opacity: slot.current ? 1 : STAR_SELECTOR_DIMMED_STATE }}
            >
              <StarGlyph status={slot.status} size={model.glyphSize} />
            </View>
          </Pressable>
        ))}
      </View>

      <InfoBox info={model.info} windowHeight={windowHeight} />
    </View>
  );
}

function InfoBox({ info, windowHeight }: { info: StarSelectorModel['info']; windowHeight: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: info.left,
        width: info.width,
        alignItems: 'center',
        ...(info.side === 'above' ? { bottom: windowHeight - info.y } : { top: info.y }),
      }}
    >
      <View testID="star-selector-info" style={INFO_BOX_STYLE}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={INFO_TEXT_STYLE}>{info.label}</Text>
          {/* The tick says the press already set it; a failed save gets none. */}
          {!info.failed && <Text style={{ ...INFO_TEXT_STYLE, color: colors.infoSuccess, marginLeft: 5 }}>✓</Text>}
        </View>
        {info.failed && <Text style={{ ...INFO_TEXT_STYLE, color: colors.infoDanger }}>⚠ not saved</Text>}
      </View>
    </View>
  );
}
