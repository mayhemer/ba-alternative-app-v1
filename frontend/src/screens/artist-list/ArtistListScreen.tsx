import React, { useCallback, useMemo } from 'react';
import {
  Platform,
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../../ui/Text';
import type { DbArtist } from '../../types/backend';
import { sortedArtistList, withLens, type Section } from './ArtistList.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtists } from '../../store/cacheStore';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
import { useStarSelectorActions } from '../../features/interests/StarSelectorContext';
import { useInterest } from '../../features/interests/InterestContext';
import { useArtistListFilter } from './ArtistListFilterContext';
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
  header: React.ReactElement;
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

const ArtistSectionList = React.memo(function ArtistSectionList({ sections, renderItem, header, scrollProps, bottomClearance }: ListProps) {
  const contentContainerStyle = useMemo(() => ({ paddingBottom: bottomClearance }), [bottomClearance]);
  return (
    <SectionList<DbArtist, Section>
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={header}
      ListEmptyComponent={EMPTY_LIST}
      {...scrollProps}
      stickySectionHeadersEnabled
      className="flex-1 bg-background"
      contentContainerStyle={contentContainerStyle}
    />
  );
});

// ── Inner screen (needs ArtistListFilterContext) ──────────────────────────────

function ArtistListScreenInner() {
  const selectedSlug = useSelectedSlug();
  const { interests } = useInterest();
  const { searchQuery, setSearchQuery } = useArtistListFilter();
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
  useBottomBar({});

  // Two steps, so a pick never sorts again: the sort follows the lineup and the
  // search only; the lens over it is a filter, and on Everything no work at all.
  const sorted = useMemo(
    () => sortedArtistList({ artists, query: searchQuery }),
    [artists, searchQuery],
  );
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

  const header = useMemo(() => (
    <View className="px-4 py-2 bg-background border-b border-border">
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        // Stable handle for native E2E (Maestro): a placeholder is not reliably
        // exposed as matchable text on iOS. Maps to accessibilityIdentifier.
        testID="artist-search"
        placeholder="Search artists…"
        placeholderTextColor="#555555"
        className="h-9 px-3 bg-surface text-textPrimary text-sm"
      />
    </View>
  ), [searchQuery, setSearchQuery]);

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
      header={header}
      scrollProps={scrollProps}
      bottomClearance={bottomClearance}
    />
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

// ArtistListFilterProvider lives above AppShell in App.tsx so that slot
// components rendered in the TopBar can access the context.
export function ArtistListScreen() {
  return <ArtistListScreenInner />;
}
