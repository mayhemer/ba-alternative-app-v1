import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  SectionList,
  View,
} from 'react-native';
import { Text } from '../../ui/Text';
import type { DbArtist } from '../../types/backend';
import { sortedArtistList, withLens, type Section } from './ArtistList.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtists } from '../../store/cacheStore';
import { useSearchScope } from '../../features/search/SearchContext';
import type { SearchScope } from '../../features/search/searchScope';
import { searchStrings } from '../../features/search/searchStrings';
import { onSupportProgram } from '../../lib/timelineJump';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
import { useStarSelectorActions } from '../../features/interests/StarSelectorContext';
import { useInterest } from '../../features/interests/InterestContext';
import { useLens } from '../../features/social/LensContext';
import { useSocialData } from '../../features/social/SocialContext';
import { useArtistDetail } from '../../features/artist-detail/ArtistDetailContext';
import { ConnectedArtistRow } from './ConnectedArtistRow';
import { SectionSeparator } from './SectionSeparator';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { LensChip } from '../../features/social/LensChip';
import { useLayoutMode } from '../../hooks/useLayoutMode';

// ── TopBar right slot (module-level for stable reference) ─────────────────────

function ArtistListTopBarRight() {
  return <LensChip />;
}

// The star selector sits on its star; once the list scrolls, it no longer
// would. Native reports the start of a drag once; web has no drag event (a wheel
// scrolls without a touch), so every scroll event asks, and closing is a no-op
// unless the selector is open.
function closeStarSelectorOnScroll(close: () => void) {
  return Platform.OS === 'web'
    ? { onScroll: close, scrollEventThrottle: 100 }
    : { onScrollBeginDrag: close };
}

// ── The list itself ───────────────────────────────────────────────────────────
//
// Memoised on purpose: SectionList hands its cells a new renderItem on every
// render of its own, so any render of it renders every mounted cell again. With
// stable props it renders only when the sections, the header or the row
// renderer change — never for a pick on the "Everything" lens, which the rows
// take themselves (ConnectedArtistRow).

type ScrollProps = ReturnType<typeof closeStarSelectorOnScroll>;

type ListProps = {
  sections: Section[];
  renderItem: ({ item }: { item: DbArtist }) => React.ReactElement;
  scrollProps: ScrollProps;
  bottomClearance: number;
};

const keyExtractor = (item: DbArtist): string => item.artistId;

const renderSectionHeader = ({ section }: { section: Section }): React.ReactElement => (
  <SectionSeparator letter={section.title} />
);

const EMPTY_LIST = (
  <View className="flex-1 items-center justify-center py-16">
    <Text className="text-textSecondary text-sm tracking-widest uppercase">
      No artists found
    </Text>
  </View>
);

const ArtistSectionList = React.memo(function ArtistSectionList({ sections, renderItem, scrollProps, bottomClearance }: ListProps) {
  const contentContainerStyle = useMemo(() => ({ paddingBottom: bottomClearance }), [bottomClearance]);
  return (
    <SectionList<DbArtist, Section>
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={EMPTY_LIST}
      {...scrollProps}
      stickySectionHeadersEnabled
      className="flex-1 bg-background"
      contentContainerStyle={contentContainerStyle}
    />
  );
});

/** What the artist list tells search: its bands, every result opening details. */
const ARTIST_SEARCH_SCOPE: SearchScope = {
  title: searchStrings.bands,
  hereOpens: 'details',
  elsewhereOpens: 'details',
  contains: (ref) => !onSupportProgram(ref.artist),
  views: [{ shows: () => true, tag: null }],
  reveal: () => undefined,
  openElsewhere: () => undefined,
};

// ── Screen ────────────────────────────────────────────────────────────────────
//
// No search field of its own: search opens from the lens panel, the same on
// every screen (features/search). A result opens the artist sheet.

export function ArtistListScreen() {
  const selectedSlug = useSelectedSlug();
  const { interests } = useInterest();
  const { scope } = useLens();
  const { getFriend, friendsByArtist } = useSocialData();
  const { openDetail } = useArtistDetail();
  const { bottomClearance } = useLayoutMode();
  const { close: closeStarSelector } = useStarSelectorActions();
  const scrollProps = useMemo(() => closeStarSelectorOnScroll(closeStarSelector), [closeStarSelector]);

  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read through the cache store: present on the first render (StartupGate has
  // already populated the cache, so no empty frame flashing "No artists found")
  // and re-rendered by the subscription when a sync lands. Derived rather than
  // copied into state, so there is no second source of truth to fall behind.
  const artists = useArtists(selectedSlug);

  useTopBar({ title: 'Artists', RightComponent: ArtistListTopBarRight });
  // Every result opens the artist sheet over the results (SearchView); bands are
  // this list's own.
  useSearchScope(ARTIST_SEARCH_SCOPE);
  useBottomBar({});

  // Two steps, so a pick never sorts again: the sort follows the lineup only;
  // the lens over it is a filter, and on Everything no work at all.
  const sorted = useMemo(() => sortedArtistList({ artists }), [artists]);
  const { loading, sections } = useMemo(
    () => withLens(sorted, { scope, interests, friendInterests }),
    [sorted, scope, interests, friendInterests],
  );

  const handleRowPress = useCallback((artist: DbArtist): void => {
    openDetail(artist, 'expanded');
  }, [openDetail]);

  const renderItem = useCallback(({ item }: { item: DbArtist }) => (
    <ConnectedArtistRow artist={item} friends={friendsByArtist[item.artistId]} onPress={handleRowPress} />
  ), [friendsByArtist, handleRowPress]);

  // Nothing cached yet is a wait, not an answer — the same state the timeline shows
  // while its days are still being derived. Filters only ever narrow the loaded
  // lineup, so an empty list after them is ListEmptyComponent.
  if (loading) {
    return <LoadingScreen message="Loading artists…" />;
  }

  return (
    <ArtistSectionList
      sections={sections}
      renderItem={renderItem}
      scrollProps={scrollProps}
      bottomClearance={bottomClearance}
    />
  );
}
