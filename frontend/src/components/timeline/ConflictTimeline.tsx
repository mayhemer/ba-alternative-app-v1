import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useCategories, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { computeConflictOverlaps } from '../../utils/conflictUtils';
import { currentTimeMs } from '../../utils/clock';
import { CategoryLane, type LaneEvent } from './CategoryLane';
import { HourTicks } from './TimeRuler';
import { LaneLabelOverlay } from './LaneLabelOverlay';
import {
  assignSubRows,
  CANVAS_WIDTH,
  conflictWindow,
  getFestivalDayStart,
  labelRepeatPx,
  LANE_HEIGHT,
  RULER_HEIGHT,
  STRIP_HEIGHT,
  timeToX,
} from './timelineLayout';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';
import type { DbArtist, DbCategory, DbEvent } from '../../types/backend';

// ── One clash group on a timeline of its own ──────────────────────────────────
//
// The conflict sheet's body: the timeline's own lanes, blocks and ruler, holding
// only the given sets — bands and support programme alike, so a clash across the
// two timelines shows whole. Cut to the group's time range (conflictWindow) out
// of the full-day canvas, the same way TimelineView cuts its 09:30 view: a
// clipping box the width of the range, the canvas shifted left inside it. The
// range is at least as wide as the view, so a short clash sits centred under a
// ruler that runs edge to edge.
//
// No lens, hidden lanes, scroll memory or landing: it is a fixed view of the clash.

type Props = {
  /** The clash group, non-empty, all on one festival day. */
  events: DbEvent[];
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
};

type Lane = { category: DbCategory; events: LaneEvent[]; height: number; offset: number; subRows: Record<string, number> };

export function ConflictTimeline({ events, onBlockPress }: Props) {
  const slug = useSelectedSlug();
  const artists = useArtists(slug);
  const categories = useCategories(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const { interests, getStatus } = useInterest();
  const { width } = useWindowDimensions();
  // The sheet spans the window up to its maximum width; measured to be exact.
  const [viewWidth, setViewWidth] = useState(() => Math.min(width, MAX_CONTENT_WIDTH));
  const handleLayout = useCallback((e: LayoutChangeEvent): void => {
    setViewWidth(e.nativeEvent.layout.width);
  }, []);

  const dayStart = getFestivalDayStart(events[0].dateFrom);
  const range = conflictWindow(events, dayStart, viewWidth);
  const fromX = timeToX(range.from, dayStart);
  const windowWidth = timeToX(range.to, dayStart) - fromX;
  const nowX = useSharedValue(timeToX(currentTimeMs(), dayStart));

  const lanes = useMemo<Lane[]>(() => {
    const artistById = new Map(artists.map((a) => [a.artistId, a]));
    const result: Lane[] = [];
    let offset = 0;
    const ordered = [...categories].sort((a, b) => parseInt(a.categoryId) - parseInt(b.categoryId));
    for (const category of ordered) {
      const laneEvents: LaneEvent[] = [];
      for (const event of events) {
        const artist = artistById.get(event.artistId);
        if (event.categoryId === category.categoryId && artist !== undefined) {
          laneEvents.push({ event, artist });
        }
      }
      if (laneEvents.length === 0) {
        continue;
      }
      const { subRowCount, eventSubRows } = assignSubRows(laneEvents.map((e) => e.event));
      const height = subRowCount * LANE_HEIGHT;
      result.push({ category, events: laneEvents, height, offset, subRows: eventSubRows });
      offset += STRIP_HEIGHT + height;
    }
    return result;
  }, [events, artists, categories]);

  // The same overlaps the timeline draws its conflict bars from.
  const conflictOverlaps = useMemo(
    () => computeConflictOverlaps(interests, { artists, stages, artistEvents }),
    [interests, artists, stages, artistEvents],
  );

  const laneOffsets = useMemo(() => Object.fromEntries(lanes.map((l) => [l.category.categoryId, l.offset])), [lanes]);
  const laneHeights = useMemo(() => Object.fromEntries(lanes.map((l) => [l.category.categoryId, l.height])), [lanes]);
  const laneStackHeight = lanes.reduce((sum, l) => sum + STRIP_HEIGHT + l.height, 0);
  const labelRepeat = labelRepeatPx(Math.min(width, MAX_CONTENT_WIDTH));

  return (
    <View testID="conflict-timeline" onLayout={handleLayout}>
      {/* Lane bands and titles sit beside the horizontal scroller, beneath the
          lanes, as in TimelineView; both start under the ruler row. */}
      <View
        style={{
          position: 'absolute',
          top: RULER_HEIGHT,
          left: 0,
          right: 0,
          height: laneStackHeight,
          backgroundColor: colors.timeline.laneBg,
        }}
      />
      <View style={{ position: 'absolute', top: RULER_HEIGHT, left: 0, right: 0, height: laneStackHeight }}>
        <LaneLabelOverlay
          categories={lanes.map((l) => l.category)}
          laneOffsets={laneOffsets}
          laneHeights={laneHeights}
          overlayTitles={false}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View testID="conflict-timeline-range" style={{ width: windowWidth, overflow: 'hidden' }}>
          <View style={{ width: CANVAS_WIDTH, transform: [{ translateX: -fromX }] }}>
            <View
              style={{
                height: RULER_HEIGHT,
                backgroundColor: colors.background,
                borderBottomWidth: 1,
                borderBottomColor: colors.timeline.rulerBorder,
              }}
            >
              <HourTicks />
            </View>
            {lanes.map((lane) => (
              <CategoryLane
                key={lane.category.categoryId}
                category={lane.category}
                events={lane.events}
                dayStart={dayStart}
                nowX={nowX}
                getStatus={getStatus}
                onBlockPress={onBlockPress}
                labelRepeat={labelRepeat}
                laneHeight={lane.height}
                overlayTitles={false}
                eventSubRows={lane.subRows}
                conflictOverlaps={conflictOverlaps}
                mountEvents
                mountFromX={fromX}
                mountToX={fromX + windowWidth}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
