import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { DbArtist } from '../types/backend';
import { getArtists } from '../cache/cacheService';
import { useAppState } from '../store/AppContext';
import { useCacheRefresh } from '../store/AppContext';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useInterest } from '../context/InterestContext';
import {
  ArtistListFilterProvider,
  useArtistListFilter,
} from '../context/ArtistListFilterContext';
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
    const letter = artist.name.charAt(0).toUpperCase();
    if (grouped[letter] === undefined) {
      grouped[letter] = [];
    }
    grouped[letter].push(artist);
  }

  return Object.keys(grouped)
    .sort()
    .map((letter) => ({
      title: letter,
      data: grouped[letter].sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

// ── TopBar right slot (module-level for stable reference) ─────────────────────

function ArtistListTopBarRight() {
  return <InterestFilterControl />;
}

// ── Inner screen (needs ArtistListFilterContext) ──────────────────────────────

function ArtistListScreenInner() {
  const { selectedSlug } = useAppState();
  const { getStatus } = useInterest();
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
      filtered = filtered.filter((a) => getStatus(a.artistId) === interestFilter);
    }

    return buildSections(filtered);
  }, [allArtists, searchQuery, interestFilter, getStatus]);

  function handleRowPress(artist: DbArtist): void {
    openDetail(artist, 'expanded');
  }

  return (
    <SectionList<DbArtist, Section>
      sections={sections}
      keyExtractor={(item) => item.artistId}
      renderItem={({ item }) => (
        <ArtistRow artist={item} onPress={handleRowPress} />
      )}
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

// ── Screen (provides ArtistListFilterContext) ─────────────────────────────────

export function ArtistListScreen() {
  return (
    <ArtistListFilterProvider>
      <ArtistListScreenInner />
    </ArtistListFilterProvider>
  );
}
