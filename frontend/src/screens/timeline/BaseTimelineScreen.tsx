import React, { useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { LoadingScreen } from '../../ui/LoadingScreen';
import type { DbArtist, DbEvent } from '../../types/backend';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
import { useArtistDetail } from '../../features/artist-detail/ArtistDetailContext';
import { useShownDay, useTimelineFilter } from './TimelineFilterContext';
import { TimelineView } from './TimelineView';
import { LensChip } from '../../features/social/LensChip';
import { useTimelineData } from './useTimelineData';
import { setSelectedDay } from '../../store/uiStatePersistence';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { noteTimelineShown } from '../../navigation/viewSwitch';

// ── Shared TopBar / BottomBar slot components ─────────────────────────────────

function TopBarRight() {
  return <LensChip />;
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
  const { openDetail } = useArtistDetail();
  const { shareOpeningDay } = useTimelineFilter();

  // ── Festival day ────────────────────────────────────────────────────────────

  // The day this screen shows, derived during render: the shared selection when
  // it is one of this edition's days, else the screen's opening day. Rendering
  // it straight away, instead of waiting for an effect to put it into the
  // context, is what removes the "Loading schedule…" frame every mount used to
  // paint first. Lanes, landing position and day are all computed from this one
  // value, so they cannot disagree. Subscribed to the cache's days through the
  // context, so a sync that repopulates the cache re-derives everything below.
  const dayToShow = useShownDay(screenKey);

  const day = useTimelineData({ dayStart: dayToShow, filterArtist, useSubRows });

  useTopBar({ title, RightComponent: TopBarRight });
  useBottomBar({ ContentComponent: BottomBarComponent });

  // Share the day this screen opened on with the back history and the other
  // timeline screen, so they follow it. It is already what this screen (and its
  // day switcher) shows, so sharing it re-renders neither; and it is a no-op once
  // a day is selected, so it can never fight a day the user picked.
  useEffect(() => {
    shareOpeningDay(dayToShow);
  }, [dayToShow, shareOpeningDay]);

  // Persist the shown day per screen whenever it changes (day switch / restore).
  useEffect(() => {
    if (dayToShow !== 0) {
      setSelectedDay(screenKey, dayToShow);
    }
  }, [dayToShow, screenKey]);

  // The timeline My plan's day buttons switch to: the one shown last.
  useFocusEffect(useCallback(() => {
    noteTimelineShown(screenKey === 'support');
  }, [screenKey]));

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
      day={day}
      selectedDayStart={dayToShow}
      onBlockPress={handleBlockPress}
    />
  );
}
