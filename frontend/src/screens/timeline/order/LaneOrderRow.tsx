import React, { useEffect, useMemo, useRef } from 'react';
import { PanResponder, View, type AccessibilityActionEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../../ui/Text';
import { strings } from '../../../i18n/strings';
import { colors } from '../../../styling/tokens';
import { LANE_ORDER_ROW } from './LaneOrderList.model';
import type { LaneOrderRowModel } from './LaneOrderRow.model';

// ── A row of the order list ───────────────────────────────────────────────────
//
// Draws its model (LaneOrderRow.model): the swatch, the name, and the ≡ handle
// on the right that a finger drags the row by. The row floats at `top`, which
// the list gives it (LaneOrderList.model slotTop); a new place is eased into,
// except while the row itself is being dragged, when it follows the finger on
// the UI thread and renders nothing per move. A screen reader moves it with
// the handle's "Move up" / "Move down" actions instead.

/** How long a row takes to slide into a new place. */
const ROW_SETTLE_MS = 160;
const HANDLE_WIDTH = 52;
const SWATCH = 14;

type Props = {
  item: LaneOrderRowModel;
  /** Its place in the list. */
  index: number;
  /** Where it sits (LaneOrderList.model slotTop). */
  top: number;
  /** Being dragged: drawn lifted, above the others. */
  lifted: boolean;
  onDragStart: (index: number) => void;
  /** The finger's distance down from where it picked the row up (up: negative). */
  onDragMove: (dy: number) => void;
  onDrop: (dy: number) => void;
  /** A screen reader's move: one place up (-1) or down (+1). */
  onStep: (index: number, by: -1 | 1) => void;
};

function LaneOrderRowBase({ item, index, top, lifted, onDragStart, onDragMove, onDrop, onStep }: Props) {
  const y = useSharedValue(top);

  // Eases into a new place; a dragged row is moved by the finger instead.
  useEffect(() => {
    if (!lifted) {
      y.value = withTiming(top, { duration: ROW_SETTLE_MS });
    }
  }, [top, lifted, y]);

  // The responder is made once; it reads the row's current props through this.
  const latest = useRef({ index, top, onDragStart, onDragMove, onDrop });
  latest.current = { index, top, onDragStart, onDragMove, onDrop };

  const pan = useMemo(() => {
    let startTop = 0;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Neither the list's scroller nor anything else takes the drag over.
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => {
        startTop = latest.current.top;
        latest.current.onDragStart(latest.current.index);
      },
      onPanResponderMove: (_event, gesture) => {
        y.value = startTop + gesture.dy;
        latest.current.onDragMove(gesture.dy);
      },
      onPanResponderRelease: (_event, gesture) => { latest.current.onDrop(gesture.dy); },
      onPanResponderTerminate: (_event, gesture) => { latest.current.onDrop(gesture.dy); },
    });
  }, [y]);

  const moveStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const actions = useMemo(() => [
    { name: 'moveUp', label: strings().laneOrder.moveUp },
    { name: 'moveDown', label: strings().laneOrder.moveDown },
  ], []);
  const handleAction = (event: AccessibilityActionEvent): void => {
    if (event.nativeEvent.actionName === 'moveUp') {
      onStep(index, -1);
    } else if (event.nativeEvent.actionName === 'moveDown') {
      onStep(index, 1);
    }
  };

  return (
    <Animated.View
      testID={`lane-order-row-${item.key}`}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: LANE_ORDER_ROW.height,
          flexDirection: 'row',
          alignItems: 'center',
          paddingLeft: 14,
          borderRadius: 8,
          backgroundColor: lifted ? colors.surfacePressed : colors.surfaceRaised,
          zIndex: lifted ? 1 : 0,
          // Lifted: a shadow over the rows it passes.
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: lifted ? 0.6 : 0,
          shadowRadius: 14,
          elevation: lifted ? 10 : 0,
          borderWidth: 1,
          borderColor: lifted ? colors.timeline.laneBorder : 'transparent',
        },
        moveStyle,
      ]}
    >
      <View
        style={{
          width: SWATCH,
          height: SWATCH,
          borderRadius: 3,
          borderWidth: 2,
          backgroundColor: item.swatchFill,
          borderColor: item.swatchEdge,
          marginRight: 12,
        }}
      />
      <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, color: colors.textPrimary }}>{item.name}</Text>
      <View
        accessible
        accessibilityLabel={item.moveLabel}
        accessibilityActions={actions}
        onAccessibilityAction={handleAction}
        style={{ width: HANDLE_WIDTH, height: LANE_ORDER_ROW.height, alignItems: 'center', justifyContent: 'center' }}
        {...pan.panHandlers}
      >
        <Ionicons name="reorder-three" size={24} color={lifted ? colors.textPrimary : colors.muted} />
      </View>
    </Animated.View>
  );
}

/** Renders again only when what it shows, or its place, changes. */
export const LaneOrderRow = React.memo(LaneOrderRowBase);
