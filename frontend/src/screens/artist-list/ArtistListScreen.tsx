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
import { strings } from '../../i18n/strings';
import { onSupportProgram } from '../../lib/timelineJump';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
import { useStarSelectorActions } from '../../features/interests/StarSelectorContext';
import { useInterest } from '../../features/interests/InterestContext';
import { useLens, useLensPanel } from '../../features/social/LensContext';
import { useSocialData } from '../../features/social/SocialContext';
import { useArtistDetail } from '../../features/artist-detail/ArtistDetailContext';
import { ConnectedArtistRow } from './ConnectedArtistRow';
import { SectionSeparator } from './SectionSeparator';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { LensChip } from '../../features/social/LensChip';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { usePullPastTop, type PullScrollProps } from '../../ui/PullPreview';
import { LensPanelSkeleton } from '../../features/social/LensPanelSkeleton';

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

type ListProps = {
  sections: Section[];
  renderItem: ({ item }: { item: DbArtist }) => React.ReactElement;
  /** Its own handlers, wrapped by the pull past its top (ui/PullPreview). */
  scrollProps: PullScrollProps;
  bottomClearance: number;
};

const keyExtractor = (item: DbArtist): string => item.artistId;

const FILL = { flex: 1 };

const renderSectionHeader = ({ section }: { section: Section }): React.ReactElement => (
  <SectionSeparator letter={section.title} />
);

// A component, not an element built at import, so its text is read in the
// language of the moment (i18n/language.ts).
function EmptyList(): React.ReactElement {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Text className="text-textSecondary text-sm tracking-widest uppercase">
        {strings().artistListScreen.empty}
      </Text>
    </View>
  );
}

const ArtistSectionList = React.memo(function ArtistSectionList({ sections, renderItem, scrollProps, bottomClearance }: ListProps) {
  const contentContainerStyle = useMemo(() => ({ paddingBottom: bottomClearance }), [bottomClearance]);
  return (
    <SectionList<DbArtist, Section>
      testID="artist-list"
      sections={sections}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      ListEmptyComponent={EmptyList}
      {...scrollProps}
      stickySectionHeadersEnabled
      className="flex-1 bg-background"
      contentContainerStyle={contentContainerStyle}
    />
  );
});

/**
 * What the artist list tells search: its bands, every result opening details.
 * One object for the app's life (its identity is what search compares); the
 * title is a getter, so it is read in the language of the moment.
 */
const ARTIST_SEARCH_SCOPE: SearchScope = {
  get title() { return strings().search.bands; },
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
  const ownScrollProps = useMemo(() => closeStarSelectorOnScroll(closeStarSelector), [closeStarSelector]);
  // A pull down past the list's top opens the lens panel, as the lens chip does
  // (switched off for now: ui/PullPreview.model › PULL_PAST_TOP_ENABLED).
  const { open: openLensPanel } = useLensPanel();
  const { scrollProps, preview } = usePullPastTop(openLensPanel, ownScrollProps, LensPanelSkeleton);

  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read through the cache store: present on the first render (StartupGate has
  // already populated the cache, so no empty frame flashing "No artists found")
  // and re-rendered by the subscription when a sync lands. Derived rather than
  // copied into state, so there is no second source of truth to fall behind.
  const artists = useArtists(selectedSlug);

  useTopBar({ title: strings().screens.artists, RightComponent: ArtistListTopBarRight });
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
    return <LoadingScreen message={strings().artistListScreen.loading} />;
  }

  return (
    <View style={FILL}>
      <ArtistSectionList
        sections={sections}
        renderItem={renderItem}
        scrollProps={scrollProps}
        bottomClearance={bottomClearance}
      />
      {preview}
    </View>
  );
}
