import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useCategories, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { computeConflictOverlaps } from '../../utils/conflictUtils';
import { useNowX } from '../../hooks/useNowX';
import { CategoryLane } from './CategoryLane';
import { conflictTimelineModel } from './ConflictTimeline.model';
import { HourTicks } from './TimeRuler';
import { LaneLabelOverlay } from './LaneLabelOverlay';
import { CANVAS_WIDTH, RULER_HEIGHT } from './timelineLayout';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';
import type { DbArtist, DbEvent } from '../../types/backend';

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
// What it shows comes from its model (ConflictTimeline.model.ts).

type Props = {
  /** The clash group, non-empty, all on one festival day. */
  events: DbEvent[];
  onBlockPress: (event: DbEvent, artist: DbArtist) => void;
};

export function ConflictTimeline({ events, onBlockPress }: Props) {
  const slug = useSelectedSlug();
  const artists = useArtists(slug);
  const categories = useCategories(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const { interests } = useInterest();
  const { width } = useWindowDimensions();
  // The sheet spans the window up to its maximum width; measured to be exact.
  const [viewWidth, setViewWidth] = useState(() => Math.min(width, MAX_CONTENT_WIDTH));
  const handleLayout = useCallback((e: LayoutChangeEvent): void => {
    setViewWidth(e.nativeEvent.layout.width);
  }, []);

  // The same overlaps the timeline draws its conflict bars from.
  const conflictOverlaps = useMemo(
    () => computeConflictOverlaps(interests, { artists, stages, artistEvents }),
    [interests, artists, stages, artistEvents],
  );
  const model = useMemo(
    () => conflictTimelineModel({ group: events, artists, categories, interests, conflictOverlaps, viewWidth }),
    [events, artists, categories, interests, conflictOverlaps, viewWidth],
  );
  const nowX = useNowX(model.dayStart);

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
          height: model.stackHeight,
          backgroundColor: colors.timeline.laneBg,
        }}
      />
      <View style={{ position: 'absolute', top: RULER_HEIGHT, left: 0, right: 0, height: model.stackHeight }}>
        <LaneLabelOverlay titles={model.titles} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View testID="conflict-timeline-range" style={{ width: model.width, overflow: 'hidden' }}>
          <View style={{ width: CANVAS_WIDTH, transform: [{ translateX: -model.fromX }] }}>
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
            {model.lanes.map((lane) => (
              <CategoryLane
                key={lane.key}
                item={lane}
                dayStart={model.dayStart}
                nowX={nowX}
                onBlockPress={onBlockPress}
                labelRepeat={model.labelRepeat}
                mountEvents
                mountFromX={model.fromX}
                mountToX={model.fromX + model.width}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
