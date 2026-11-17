import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../../ui/Text';
import { PanelFadeIn } from '../../../ui/PanelFadeIn';
import { useLayoutMode } from '../../../hooks/useLayoutMode';
import { useSelectedSlug } from '../../../store/AppContext';
import { useArtists, useCategories, useEvents } from '../../../store/cacheStore';
import { strings } from '../../../i18n/strings';
import { useTimelineFilter } from '../TimelineFilterContext';
import { useLaneOrderPanel, useOpenLaneOrder, type OpenLaneOrder } from './LaneOrderPanelContext';
import { orderLanes, screenCategories } from './laneOrder';
import { laneOrderPanelModel } from './LaneOrderPanel.model';
import { LaneOrderList } from './LaneOrderList';
import type { DbArtist } from '../../../types/backend';
import {
  colors,
  OVERLAY_BACKDROP,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_RADIUS,
} from '../../../styling/tokens';

// ── The order panel: "Stage order" / "Category order" ─────────────────────────
//
// Opened by a long press on a timeline (BaseTimelineScreen), for that timeline:
// every one of its lanes, on any day, in its order (laneOrder), a ≡ handle on
// each row to drag it to a new place. A drop moves the lane on the timeline
// at once and is remembered; there is nothing to confirm. ✕, a tap beside the
// card, Android's back, or leaving the screen close it.
//
// Drawn by AppShell where the lens and filter panels are, with their backdrop
// and card; no search field at the bottom, the card reaches down to the margin.

/** The card's width on a roomy screen; a phone's is the screen's, less the margins. */
const WIDE_CARD_WIDTH = 420;
const HEADER_HEIGHT = 60;
const CARD_PADDING = 12;
const CLOSE_SIZE = 48;

const NO_ORDER: readonly string[] = [];
const EVERY_ARTIST = (): boolean => true;

export function LaneOrderPanel() {
  const opened = useOpenLaneOrder();
  if (opened === null) {
    return null;
  }
  return <LaneOrderPanelContent opened={opened} />;
}

function LaneOrderPanelContent({ opened }: { opened: OpenLaneOrder }) {
  const { screenKey } = opened;
  const filterArtist: (artist: DbArtist) => boolean = opened.filterArtist ?? EVERY_ARTIST;
  const { close } = useLaneOrderPanel();
  const { laneOrders, setLaneOrder } = useTimelineFilter();
  const { isWide } = useLayoutMode();
  const slug = useSelectedSlug();
  const categories = useCategories(slug);
  const events = useEvents(slug);
  const artists = useArtists(slug);
  const order = laneOrders[screenKey] ?? NO_ORDER;

  const lanes = useMemo(
    () => screenCategories({ categories, events, artists, filterArtist }),
    [categories, events, artists, filterArtist],
  );
  const model = useMemo(
    () => laneOrderPanelModel({ support: screenKey === 'support', categories: orderLanes(lanes, order) }),
    [screenKey, lanes, order],
  );

  const handleReorder = useCallback((next: string[]): void => {
    setLaneOrder(screenKey, next);
  }, [setLaneOrder, screenKey]);

  // The list's scroller stays put under a dragged row.
  const [dragging, setDragging] = useState(false);

  // Android's back closes the panel first. Registered after the back history's
  // own handler (navigation/BackHistoryTracker), so it is asked first.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => { sub.remove(); };
  }, [close]);

  return (
    <PanelFadeIn>
      {/* Backdrop — a tap beside the card closes the panel */}
      <Pressable
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={strings().laneOrder.close}
        style={{ position: 'absolute', inset: 0, backgroundColor: OVERLAY_BACKDROP }}
      />
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          bottom: OVERLAY_PANEL_MARGIN,
          left: OVERLAY_PANEL_MARGIN,
          right: OVERLAY_PANEL_MARGIN,
          alignItems: isWide ? 'center' : 'stretch',
        }}
      >
        <View
          style={{
            flexShrink: 1,
            width: isWide ? WIDE_CARD_WIDTH : undefined,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: OVERLAY_PANEL_RADIUS,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 12,
          }}
        >
          <View
            style={{
              height: HEADER_HEIGHT,
              flexDirection: 'row',
              alignItems: 'center',
              paddingLeft: 18,
              paddingRight: 6,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 17, fontFamily: 'Bold-Default', color: colors.textPrimary }}>{model.title}</Text>
              <Text numberOfLines={1} style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>{model.subtitle}</Text>
            </View>
            <Pressable
              testID="lane-order-close"
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={strings().laneOrder.close}
              style={{ width: CLOSE_SIZE, height: CLOSE_SIZE, alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView scrollEnabled={!dragging} style={{ flexGrow: 0 }} contentContainerStyle={{ padding: CARD_PADDING }}>
            <LaneOrderList rows={model.rows} onReorder={handleReorder} onDragging={setDragging} />
          </ScrollView>
        </View>
      </View>
    </PanelFadeIn>
  );
}
