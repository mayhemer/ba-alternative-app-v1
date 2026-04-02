import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { useConflictDetail } from '../../context/ConflictDetailContext';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { useInterest, type InterestStatus } from '../../context/InterestContext';
import { useAppState, useCacheRefresh } from '../../store/AppContext';
import { getArtists, getStages } from '../../cache/cacheService';
import { getStageLocalized } from '../../utils/localization';
import {
  PIXELS_PER_MS,
  LANE_HEIGHT,
  RULER_HEIGHT,
  formatTime,
} from '../timeline/timelineLayout';
import { colors } from '../../styling/tokens';
import type { DbArtist, DbEvent, DbStage } from '../../types/backend';

// ── Constants ──────────────────────────────────────────────────────────────────

const SNAP_POINTS = ['100%'];
const PADDING_MS = 30 * 60 * 1000; // 30 min padding on each side
const MINI_BLOCK_HEIGHT = LANE_HEIGHT - 8;
const HOUR_MS = 60 * 60 * 1000;
const MIN_BLOCK_WIDTH = 40;

// ── Backdrop ──────────────────────────────────────────────────────────────────

function Backdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
    />
  );
}

// ── Mini timeline ──────────────────────────────────────────────────────────────

type MiniTimelineProps = {
  sourceEvent: DbEvent;
  overlappingEvents: DbEvent[];
  artistById: Record<string, DbArtist>;
  stageById: Record<string, DbStage>;
  onEventPress: (event: DbEvent) => void;
};

const STAR_ICON: Record<InterestStatus, string> = {
  none:     '',
  maybe:    '☆',
  must_see: '★',
};

function MiniTimeline({ sourceEvent, overlappingEvents, artistById, stageById, onEventPress }: MiniTimelineProps) {
  const { getStatus } = useInterest();
  const rangeStart = sourceEvent.dateFrom - PADDING_MS;
  const rangeEnd   = sourceEvent.dateTo   + PADDING_MS;
  const rangeMs    = rangeEnd - rangeStart;
  const canvasWidth = Math.max(200, rangeMs * PIXELS_PER_MS);

  // All events sorted by start time
  const allEvents = useMemo(
    () => [sourceEvent, ...overlappingEvents].sort((a, b) => a.dateFrom - b.dateFrom),
    [sourceEvent, overlappingEvents],
  );

  // Greedy sub-row assignment to avoid visual overlap
  const eventSubRows = useMemo(() => {
    const subRowEndTimes: number[] = [];
    const rows: Record<string, number> = {};
    for (const event of allEvents) {
      let placed = false;
      /*
      for (let row = 0; row < subRowEndTimes.length; row++) {
        if (subRowEndTimes[row] <= event.dateFrom) {
          rows[event.eventId] = row;
          subRowEndTimes[row] = event.dateTo;
          placed = true;
          break;
        }
      }
      */
      if (!placed) {
        rows[event.eventId] = subRowEndTimes.length;
        subRowEndTimes.push(event.dateTo);
      }
    }
    return rows;
  }, [allEvents]);

  const totalRows = useMemo(
    () => Math.max(1, ...Object.values(eventSubRows).map((r) => r + 1)),
    [eventSubRows],
  );

  const canvasHeight = RULER_HEIGHT + totalRows * LANE_HEIGHT;

  // Hour tick marks within the range
  const hourTicks = useMemo(() => {
    const ticks: number[] = [];
    const firstHour = Math.ceil(rangeStart / HOUR_MS) * HOUR_MS;
    let t = firstHour;
    while (t <= rangeEnd) {
      ticks.push(t);
      t += HOUR_MS;
    }
    return ticks;
  }, [rangeStart, rangeEnd]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator style={{ marginTop: 8 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ width: canvasWidth, height: canvasHeight }}>

        {/* Time ruler */}
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: RULER_HEIGHT,
          borderBottomWidth: 1,
          borderBottomColor: colors.timeline.rulerBorder,
        }}>
          {hourTicks.map((tick) => {
            const x = (tick - rangeStart) * PIXELS_PER_MS;
            return (
              <View key={tick} style={{ position: 'absolute', left: x }}>
                <Text style={{ fontSize: 10, color: colors.timeline.rulerText, paddingLeft: 4, lineHeight: RULER_HEIGHT }}>
                  {formatTime(tick)}
                </Text>
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  width: 1,
                  height: 6,
                  backgroundColor: colors.timeline.rulerBorder,
                }} />
              </View>
            );
          })}
        </View>

        {/* Lane background */}
        <View style={{
          position: 'absolute',
          top: RULER_HEIGHT,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.timeline.laneBg,
        }} />

        {/* Event blocks */}
        {allEvents.map((event) => {
          const isSource   = event.eventId === sourceEvent.eventId;
          const blockLeft  = Math.max(0, (event.dateFrom - rangeStart) * PIXELS_PER_MS);
          const blockWidth = Math.max(MIN_BLOCK_WIDTH, (event.dateTo - event.dateFrom) * PIXELS_PER_MS);
          const blockTop   = RULER_HEIGHT + (eventSubRows[event.eventId] ?? 0) * LANE_HEIGHT + 4;
          const artist     = artistById[event.artistId];
          const stage      = stageById[event.stageId];
          const stageName  = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
          const status     = artist !== undefined ? getStatus(artist.artistId) : 'none';
          const starIcon   = STAR_ICON[status];

          return (
            <TouchableOpacity
              key={event.eventId}
              onPress={() => onEventPress(event)}
              activeOpacity={0.75}
              style={{
                position: 'absolute',
                left: blockLeft,
                top: blockTop,
                width: blockWidth,
                height: MINI_BLOCK_HEIGHT,
                backgroundColor: isSource ? 'rgba(255,255,255,0.12)' : colors.surfaceRaised,
                borderWidth: 1,
                borderColor: isSource ? colors.white : colors.amber,
                borderStyle: isSource ? undefined : 'dashed',
                padding: 4,
                overflow: 'hidden',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Bold-Default' }}
                >
                  {artist?.name ?? ''}
                </Text>
                {starIcon !== '' && (
                  <Text style={{ fontSize: 10, color: colors.accent, marginLeft: 2 }}>
                    {starIcon}
                  </Text>
                )}
              </View>
              <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textSecondary }}>
                {stageName}
              </Text>
              <Text numberOfLines={1} style={{ fontSize: 10, color: colors.textMuted }}>
                {formatTime(event.dateFrom)}–{formatTime(event.dateTo)}
              </Text>
            </TouchableOpacity>
          );
        })}

      </View>
    </ScrollView>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

type HeaderProps = {
  sourceEvent: DbEvent;
  artistName: string;
  stageName: string;
  onClose: () => void;
};

function ConflictDetailHeader({ sourceEvent, artistName, stageName, onClose }: HeaderProps) {
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            fontFamily: 'Bold-Default',
            color: colors.textPrimary,
          }}>
            {artistName}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {stageName}  ·  {formatTime(sourceEvent.dateFrom)}–{formatTime(sourceEvent.dateTo)}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8}>
          <Text style={{ fontSize: 20, color: colors.textSecondary, lineHeight: 28 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function ConflictDetailSheet() {
  const { conflictState, closeConflict } = useConflictDetail();
  const { openDetail } = useArtistDetail();
  const { selectedSlug } = useAppState();
  const { top } = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  // Increment to force artistById/stageById recompute when cache is refreshed.
  const [cacheRevision, setCacheRevision] = useState(0);
  const bumpRevision = useCallback(() => setCacheRevision((n) => n + 1), []);
  useCacheRefresh(bumpRevision);

  useEffect(() => {
    if (conflictState.sourceEvent === null) {
      sheetRef.current?.close();
    } else {
      sheetRef.current?.expand();
    }
  }, [conflictState.sourceEvent]);

  const handleClose = useCallback((): void => {
    closeConflict();
  }, [closeConflict]);

  const artistById = useMemo(() => {
    void cacheRevision; // invalidate when cache refreshes
    const list = getArtists(selectedSlug);
    return Object.fromEntries(list.map((a) => [a.artistId, a]));
  }, [selectedSlug, cacheRevision]);

  const stageById = useMemo(() => {
    void cacheRevision; // invalidate when cache refreshes
    const list = getStages(selectedSlug);
    return Object.fromEntries(list.map((s) => [s.stageId, s]));
  }, [selectedSlug, cacheRevision]);

  const handleEventPress = useCallback((event: DbEvent): void => {
    const artist = artistById[event.artistId];
    if (artist !== undefined) {
      openDetail(artist, 'expanded');
      // Defer conflict close to let the artist sheet start its open animation
      // before the conflict sheet's backdrop begins fading out.
      setTimeout(() => closeConflict(), 50);
    }
  }, [artistById, closeConflict, openDetail]);

  const sourceArtistName = conflictState.sourceEvent !== null
    ? (artistById[conflictState.sourceEvent.artistId]?.name ?? '')
    : '';

  const sourceStageName = conflictState.sourceEvent !== null
    ? (() => {
        const stage = stageById[conflictState.sourceEvent.stageId];
        return stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
      })()
    : '';

  if (Platform.OS === 'web') {
    if (conflictState.sourceEvent === null) { return null; }
    return (
      <View style={{ position: 'absolute', inset: 0, backgroundColor: colors.background }}>
        <ConflictDetailHeader
          sourceEvent={conflictState.sourceEvent}
          artistName={sourceArtistName}
          stageName={sourceStageName}
          onClose={handleClose}
        />
        <ScrollView>
          <View style={{ padding: 16 }}>
            <MiniTimeline
              sourceEvent={conflictState.sourceEvent}
              overlappingEvents={conflictState.overlappingEvents}
              artistById={artistById}
              stageById={stageById}
              onEventPress={handleEventPress}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
      topInset={top}
      animationConfigs={{ reduceMotion: ReduceMotion.Never }}
      enablePanDownToClose
      onClose={handleClose}
      backdropComponent={Backdrop}
      handleIndicatorStyle={{
        backgroundColor: colors.borderMid,
        width: 36,
        height: 4,
        borderRadius: 2,
      }}
      handleStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
      backgroundStyle={{ backgroundColor: colors.surface }}
    >
      {conflictState.sourceEvent !== null && (
        <ConflictDetailHeader
          sourceEvent={conflictState.sourceEvent}
          artistName={sourceArtistName}
          stageName={sourceStageName}
          onClose={handleClose}
        />
      )}
      <BottomSheetScrollView>
        {conflictState.sourceEvent !== null && (
          <View style={{ padding: 16 }}>
            <MiniTimeline
              sourceEvent={conflictState.sourceEvent}
              overlappingEvents={conflictState.overlappingEvents}
              artistById={artistById}
              stageById={stageById}
              onEventPress={handleEventPress}
            />
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
