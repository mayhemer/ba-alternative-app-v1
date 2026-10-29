import React, { useCallback, useMemo } from 'react';
import {
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../../ui/Text';
import type { DbArtist } from '../../types/backend';
import { artistListModel, type Section } from './ArtistList.model';
import { artistRowModel } from './ArtistRow.model';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtists } from '../../store/cacheStore';
import { useTopBar, useBottomBar } from '../../shell/ScreenUIContext';
import { useInterest } from '../../features/interests/InterestContext';
import { useArtistListFilter } from './ArtistListFilterContext';
import { useLens } from '../../features/social/LensContext';
import { useSocialData } from '../../features/social/SocialContext';
import { useArtistDetail } from '../../features/artist-detail/ArtistDetailContext';
import { ArtistRow } from './ArtistRow';
import { SectionSeparator } from './SectionSeparator';
import { LoadingScreen } from '../../ui/LoadingScreen';
import { LensChip } from '../../features/social/LensChip';
import { useLayoutMode } from '../../hooks/useLayoutMode';

// ── TopBar right slot (module-level for stable reference) ─────────────────────

function ArtistListTopBarRight() {
  return <LensChip />;
}

// ── Inner screen (needs ArtistListFilterContext) ──────────────────────────────

function ArtistListScreenInner() {
  const selectedSlug = useSelectedSlug();
  const { getStatus, interests } = useInterest();
  const { searchQuery, setSearchQuery } = useArtistListFilter();
  const { scope } = useLens();
  const { getFriend, friendsByArtist } = useSocialData();
  const { openDetail } = useArtistDetail();
  const { bottomClearance } = useLayoutMode();

  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read through the cache store: present on the first render (StartupGate has
  // already populated the cache, so no empty frame flashing "No artists found")
  // and re-rendered by the subscription when a sync lands. Derived rather than
  // copied into state, so there is no second source of truth to fall behind.
  const artists = useArtists(selectedSlug);

  useTopBar({ title: 'Artists', RightComponent: ArtistListTopBarRight });
  useBottomBar({});

  const { loading, sections } = useMemo(
    () => artistListModel({ artists, query: searchQuery, scope, interests, friendInterests }),
    [artists, searchQuery, scope, interests, friendInterests],
  );

  const handleRowPress = useCallback((artist: DbArtist): void => {
    openDetail(artist, 'expanded');
  }, [openDetail]);

  const renderItem = useCallback(({ item }: { item: DbArtist }) => (
    <ArtistRow
      item={artistRowModel({ artist: item, status: getStatus(item.artistId), friends: friendsByArtist[item.artistId] })}
      onPress={handleRowPress}
    />
  ), [getStatus, friendsByArtist, handleRowPress]);

  // Nothing cached yet is a wait, not an answer — the same state the timeline shows
  // while its days are still being derived. Filters only ever narrow the loaded
  // lineup, so an empty list after them is ListEmptyComponent.
  if (loading) {
    return <LoadingScreen message="Loading artists…" />;
  }

  return (
    <SectionList<DbArtist, Section>
      sections={sections}
      keyExtractor={(item) => item.artistId}
      renderItem={renderItem}
      renderSectionHeader={({ section }) => (
        <SectionSeparator letter={section.title} />
      )}
      ListHeaderComponent={
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
      }
      ListEmptyComponent={
        <View className="flex-1 items-center justify-center py-16">
          <Text className="text-textSecondary text-sm tracking-widest uppercase">
            No artists found
          </Text>
        </View>
      }
      stickySectionHeadersEnabled
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: bottomClearance }}
    />
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

// ArtistListFilterProvider lives above AppShell in App.tsx so that slot
// components rendered in the TopBar can access the context.
export function ArtistListScreen() {
  return <ArtistListScreenInner />;
}
