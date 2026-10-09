import React, { useCallback, useMemo } from 'react';
import {
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text';
import type { DbArtist } from '../types/backend';
import { useSelectedSlug } from '../store/AppContext';
import { useArtists } from '../store/cacheStore';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useInterest } from '../context/InterestContext';
import { useArtistListFilter } from '../context/ArtistListFilterContext';
import { useLens } from '../context/LensContext';
import { useSocialData } from '../context/SocialContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { ArtistRow } from '../components/ArtistRow';
import { SectionSeparator } from '../components/SectionSeparator';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { LensChip } from '../components/social/LensChip';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { matchesScope } from '../utils/interestUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: DbArtist[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Hoisted: localeCompare with options builds a fresh collator on every comparison
// (~50x slower). The default locale is resolved once, at module load.
const LETTER_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base' });
const NAME_COLLATOR = new Intl.Collator(undefined, { sensitivity: 'base', ignorePunctuation: true });

// Exported for the performance suite: the collated sort inside is the most
// expensive thing the list does, and it re-runs on every keystroke.
export function buildSections(artists: DbArtist[]): Section[] {
  const grouped: Record<string, DbArtist[]> = {};

  for (const artist of artists) {
    const first = artist.name.charAt(0);
    const base = first.normalize('NFD').replace(/\p{M}/gu, '');
    const letter = /\d/.test(first) ? '#' : (base.toUpperCase() || '#');
    if (grouped[letter] === undefined) {
      grouped[letter] = [];
    }
    grouped[letter].push(artist);
  }

  return Object.keys(grouped)
    .sort((a, b) => {
      if (a === '#') { return -1; }
      if (b === '#') { return 1; }
      return LETTER_COLLATOR.compare(a, b);
    })
    .map((letter) => ({
      title: letter,
      data: grouped[letter].sort((a, b) => NAME_COLLATOR.compare(a.name, b.name)),
    }));
}

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
  const { getFriend } = useSocialData();
  const { openDetail } = useArtistDetail();
  const { bottomClearance } = useLayoutMode();

  const friendInterests =
    scope.kind === 'friend' ? getFriend(scope.token)?.interests : undefined;

  // Read through the cache store: present on the first render (StartupGate has
  // already populated the cache, so no empty frame flashing "No artists found")
  // and re-rendered by the subscription when a sync lands. Derived rather than
  // copied into state, so there is no second source of truth to fall behind.
  const artists = useArtists(selectedSlug);
  const allArtists = useMemo(
    () => artists.filter((a) => a.isPlayable),
    [artists],
  );

  useTopBar({ title: 'Artists', RightComponent: ArtistListTopBarRight });
  useBottomBar({});

  const sections = useMemo<Section[]>(() => {
    let filtered = allArtists;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
    }

    if (scope.kind !== 'all') {
      filtered = filtered.filter((a) =>
        matchesScope(scope, interests[a.artistId] ?? 'none', friendInterests?.[a.artistId]),
      );
    }

    return buildSections(filtered);
  }, [allArtists, searchQuery, scope, friendInterests, interests]);

  const handleRowPress = useCallback((artist: DbArtist): void => {
    openDetail(artist, 'expanded');
  }, [openDetail]);

  const renderItem = useCallback(({ item }: { item: DbArtist }) => (
    <ArtistRow artist={item} status={getStatus(item.artistId)} onPress={handleRowPress} />
  ), [getStatus, handleRowPress]);

  // Nothing cached yet is a wait, not an answer — the same state the timeline shows
  // while its days are still being derived. Filters only ever narrow `allArtists`,
  // so an empty one cannot be a filtered-out result; that case is ListEmptyComponent.
  if (allArtists.length === 0) {
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
