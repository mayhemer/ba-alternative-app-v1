import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SectionList,
  TextInput,
  View,
} from 'react-native';
import { Text } from '../components/ui/Text';
import type { DbArtist } from '../types/backend';
import { getArtists } from '../cache/cacheService';
import { useAppState } from '../store/AppContext';
import { useCacheRefresh } from '../store/AppContext';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useInterest } from '../context/InterestContext';
import { useArtistListFilter } from '../context/ArtistListFilterContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { ArtistRow } from '../components/ArtistRow';
import { SectionSeparator } from '../components/SectionSeparator';
import { InterestFilterControl } from '../components/InterestFilterControl';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = {
  title: string;
  data: DbArtist[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildSections(artists: DbArtist[]): Section[] {
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
      return a.localeCompare(b, undefined, { sensitivity: 'base' });
    })
    .map((letter) => ({
      title: letter,
      data: grouped[letter].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base', ignorePunctuation: true })
      ),
    }));
}

// ── TopBar right slot (module-level for stable reference) ─────────────────────

function ArtistListTopBarRight() {
  return <InterestFilterControl />;
}

// ── Inner screen (needs ArtistListFilterContext) ──────────────────────────────

function ArtistListScreenInner() {
  const { selectedSlug } = useAppState();
  const { getStatus, interests } = useInterest();
  const { searchQuery, setSearchQuery, interestFilter } = useArtistListFilter();
  const { openDetail } = useArtistDetail();

  const [allArtists, setAllArtists] = useState<DbArtist[]>([]);

  const loadArtists = useCallback(() => {
    const playable = getArtists(selectedSlug).filter((a) => a.isPlayable);
    setAllArtists(playable);
  }, [selectedSlug]);

  useEffect(() => {
    loadArtists();
  }, [loadArtists]);

  useCacheRefresh(loadArtists);

  useTopBar({ title: 'Artists', RightComponent: ArtistListTopBarRight });
  useBottomBar({});

  const sections = useMemo<Section[]>(() => {
    let filtered = allArtists;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
    }

    if (interestFilter !== null) {
      filtered = filtered.filter((a) => (interests[a.artistId] ?? 'none') === interestFilter);
    }

    return buildSections(filtered);
  }, [allArtists, searchQuery, interestFilter, interests]);

  const handleRowPress = useCallback((artist: DbArtist): void => {
    openDetail(artist, 'expanded');
  }, [openDetail]);

  const renderItem = useCallback(({ item }: { item: DbArtist }) => (
    <ArtistRow artist={item} status={getStatus(item.artistId)} onPress={handleRowPress} />
  ), [getStatus, handleRowPress]);

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
    />
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

// ArtistListFilterProvider lives above AppShell in App.tsx so that slot
// components rendered in the TopBar can access the context.
export function ArtistListScreen() {
  return <ArtistListScreenInner />;
}
