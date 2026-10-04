import React, { useCallback, useEffect, useMemo } from 'react';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useSelectedSlug } from '../store/AppContext';
import { useFestivalDays } from '../store/cacheStore';
import type { DbArtist, DbEvent } from '../types/backend';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { TimelineView } from '../components/timeline/TimelineView';
import { LensChip } from '../components/social/LensChip';
import { useTimelineData } from '../hooks/useTimelineData';
import { getSelectedDay, setSelectedDay } from '../store/uiStatePersistence';
import { getFestivalDayStart } from '../components/timeline/timelineLayout';
import { currentTimeMs } from '../utils/clock';
import { useLayoutMode } from '../hooks/useLayoutMode';

// ── Shared TopBar / BottomBar slot components ─────────────────────────────────

function TopBarRight() {
  return <LensChip />;
}


// ── Which day a screen opens on ──────────────────────────────────────────────

/**
 * The day to show when the shared selection is not one of this edition's days
 * (nothing chosen yet, or a stale one): the screen's own remembered day if still
 * valid, else today if it is a festival day, else the first day. 0 while the
 * edition has no days at all.
 */
function openingDay(screenKey: string, days: number[]): number {
  if (days.length === 0) {
    return 0;
  }
  const persisted = getSelectedDay(screenKey);
  if (persisted !== undefined && days.includes(persisted)) {
    return persisted;
  }
  const today = getFestivalDayStart(currentTimeMs());
  return days.find((d) => d === today) ?? days[0];
}

// ── Shared screen logic ───────────────────────────────────────────────────────

type Props = {
  title: string;
  screenKey: string;
  BottomBarComponent: React.ComponentType;
  filterArtist?: (artist: DbArtist) => boolean;
  useSubRows?: boolean;
};

export function BaseTimelineScreen({ title, screenKey, BottomBarComponent, filterArtist, useSubRows = false }: Props) {
  const selectedSlug = useSelectedSlug();
  const { openDetail } = useArtistDetail();
  const {
    setFestivalDays,
    selectedDayStart,
    setSelectedDayStart,
  } = useTimelineFilter();

  // ── Festival-day initialisation ─────────────────────────────────────────────

  // The days themselves, subscribed — so a sync that repopulates the cache
  // re-derives everything below.
  const days = useFestivalDays(selectedSlug);

  // The day this screen shows, derived during render: the shared selection when
  // it is one of this edition's days, else the screen's opening day. Rendering
  // it straight away, instead of waiting for an effect to put it into the
  // context, is what removes the "Loading schedule…" frame every mount used to
  // paint first. Lanes, landing position and day are all computed from this one
  // value, so they cannot disagree while the context catches up.
  const dayToShow = useMemo(
    () => (days.includes(selectedDayStart) ? selectedDayStart : openingDay(screenKey, days)),
    [days, selectedDayStart, screenKey],
  );

  const { eventsByCategory, visibleCategories, laneHeights, laneOffsets, categorySubRows, canvasHeight, conflictOverlaps } =
    useTimelineData({ dayStart: dayToShow, filterArtist, useSubRows });

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarComponent });

  // Share the days and the shown day with the day switcher (and the other
  // timeline screen). Only ever copies the derived value over, so it can never
  // fight a day the user picked: a valid selection is its own derivation.
  useEffect(() => {
    setFestivalDays(days);
    if (dayToShow !== 0 && dayToShow !== selectedDayStart) {
      setSelectedDayStart(dayToShow);
    }
  }, [days, dayToShow, selectedDayStart, setFestivalDays, setSelectedDayStart]);

  // Persist the selected day per screen whenever it changes (day switch / restore).
  useEffect(() => {
    if (selectedDayStart !== 0) {
      setSelectedDay(screenKey, selectedDayStart);
    }
  }, [selectedDayStart, screenKey]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const { isWide } = useLayoutMode();

  // A roomy viewport has space to show the whole sheet at once; elsewhere it
  // opens at the collapsed stop, which stays usable on short screens because
  // ArtistDetailSheet floors it in points rather than a percentage.
  const handleBlockPress = useCallback((_event: DbEvent, artist: DbArtist): void => {
    openDetail(artist, isWide ? 'expanded' : 'collapsed');
  }, [openDetail, isWide]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (dayToShow === 0) {
    return <LoadingScreen message="Loading schedule…" />;
  }

  return (
    <TimelineView
      screenKey={screenKey}
      visibleCategories={visibleCategories}
      eventsByCategory={eventsByCategory}
      laneHeights={laneHeights}
      laneOffsets={laneOffsets}
      categorySubRows={categorySubRows}
      canvasHeight={canvasHeight}
      selectedDayStart={dayToShow}
      onBlockPress={handleBlockPress}
      conflictOverlaps={conflictOverlaps}
    />
  );
}
