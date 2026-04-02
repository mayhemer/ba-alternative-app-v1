import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useInterest } from '../context/InterestContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { useAppState, useCacheRefresh } from '../store/AppContext';
import { getArtists, getArtistEvents, getStages } from '../cache/cacheService';
import { eventsOverlap } from '../utils/conflictUtils';
import { formatTime, formatDayLabel } from '../components/timeline/timelineLayout';
import { getStageLocalized } from '../utils/localization';
import { useTopBar } from '../context/ScreenUIContext';
import { colors } from '../styling/tokens';
import type { DbArtist, DbEvent } from '../types/backend';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConflictEntry = {
  event: DbEvent;
  artist: DbArtist;
  stageName: string;
  overlapCount: number;
  overlappingEvents: DbEvent[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeConflictEntries(
  slug: string,
  interests: Record<string, string>,
): ConflictEntry[] {
  const artists = getArtists(slug);
  const stages = getStages(slug);
  const stageById = Object.fromEntries(stages.map((s) => [s.stageId, s]));
  const artistById = Object.fromEntries(artists.map((a) => [a.artistId, a]));

  // Collect all must_see events with their artist
  const markedEvents: DbEvent[] = [];
  for (const artist of artists) {
    const status = interests[artist.artistId] ?? 'none';
    if (status === 'must_see') {
      const events = getArtistEvents(slug, artist.artistId);
      markedEvents.push(...events);
    }
  }

  // Build conflict map: eventId → overlapping events
  const conflictMap = new Map<string, DbEvent[]>();
  for (let i = 0; i < markedEvents.length; i++) {
    for (let j = i + 1; j < markedEvents.length; j++) {
      const a = markedEvents[i];
      const b = markedEvents[j];
      if (eventsOverlap(a, b)) {
        if (!conflictMap.has(a.eventId)) { conflictMap.set(a.eventId, []); }
        if (!conflictMap.has(b.eventId)) { conflictMap.set(b.eventId, []); }
        conflictMap.get(a.eventId)!.push(b);
        conflictMap.get(b.eventId)!.push(a);
      }
    }
  }

  // Build entries for conflicting events only, sorted by start time
  const entries: ConflictEntry[] = markedEvents
    .filter((e) => conflictMap.has(e.eventId))
    .sort((a, b) => a.dateFrom - b.dateFrom)
    .map((event) => {
      const overlapping = conflictMap.get(event.eventId) ?? [];
      const artist = artistById[event.artistId];
      const stage = stageById[event.stageId];
      const stageName = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
      return {
        event,
        artist,
        stageName,
        overlapCount: overlapping.length,
        overlappingEvents: overlapping,
      };
    });

  return entries;
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ConflictsScreen() {
  useTopBar({ title: 'Conflicts' });

  const { selectedSlug } = useAppState();
  const { interests } = useInterest();
  const { openConflict } = useConflictDetail();

  const [entries, setEntries] = useState<ConflictEntry[]>([]);

  const recompute = useCallback(() => {
    setEntries(computeConflictEntries(selectedSlug, interests));
  }, [selectedSlug, interests]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  useCacheRefresh(recompute);

  const handleCardPress = useCallback((entry: ConflictEntry): void => {
    openConflict(entry.event, entry.overlappingEvents);
  }, [openConflict]);

  if (entries.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
          No conflicts in your schedule.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16 }}>
      {entries.map((entry, index) => {
        const nextEntry = entries[index + 1];
        // Show connector bar if consecutive entries' events overlap each other
        const showConnector = nextEntry !== undefined &&
          entry.overlappingEvents.some((e) => e.eventId === nextEntry.event.eventId);

        return (
          <View key={entry.event.eventId}>
            <TouchableOpacity
              onPress={() => handleCardPress(entry)}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 8,
                padding: 16,
                marginBottom: showConnector ? 0 : 60,
                borderWidth: 1,
                borderColor: colors.borderConflict,
              }}
              activeOpacity={0.75}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '700',
                color: colors.textPrimary,
                fontFamily: 'Bold-Default',
              }}>
                {entry.artist?.name ?? ''}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {entry.stageName}  ·  {formatDayLabel(entry.event.dateFrom)}  ·  {formatTime(entry.event.dateFrom)}–{formatTime(entry.event.dateTo)}
              </Text>
              <Text style={{ fontSize: 12, color: colors.amber, marginTop: 6 }}>
                Overlaps with {entry.overlapCount} other {entry.overlapCount === 1 ? 'event' : 'events'}
              </Text>
            </TouchableOpacity>

            {showConnector && (
              <View style={{
                alignSelf: 'center',
                width: 4,
                height: 16,
                backgroundColor: colors.borderConflict,
              }} />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
