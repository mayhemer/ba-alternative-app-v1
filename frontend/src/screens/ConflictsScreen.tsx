import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useInterest } from '../context/InterestContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { useAppState, useCacheRefresh } from '../store/AppContext';
import { getArtists, getArtistEvents, getStages } from '../cache/cacheService';
import { eventsOverlap } from '../utils/conflictUtils';
import { formatTime, formatDayLabel } from '../components/timeline/timelineLayout';
import { getStageLocalized } from '../utils/localization';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { colors, MAX_CONTENT_WIDTH } from '../styling/tokens';
import type { DbArtist, DbEvent } from '../types/backend';
import { STAR_ICON_INDICATOR } from '../components/StarButton';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConflictEntry = {
  leader: boolean;
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
    // TODO: may want a filter that will include "maybe" into the conflict list
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
  let latest = 0;
  const entries: ConflictEntry[] = markedEvents
    .filter((e) => conflictMap.has(e.eventId))
    .sort((a, b) => a.dateFrom - b.dateFrom)
    .map((event) => {
      const overlapping = conflictMap.get(event.eventId) ?? [];
      const artist = artistById[event.artistId];
      const stage = stageById[event.stageId];
      const stageName = stage !== undefined ? getStageLocalized(stage.localized, 'name') : '';
      // Keep track of the whole overlap graph, leader == true for the first event in a group
      const leader = event.dateFrom > latest;
      latest = leader ? event.dateTo : Math.max(latest, event.dateTo);

      return {
        leader,
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
  useBottomBar({});

  const { selectedSlug } = useAppState();
  const { interests, getStatus } = useInterest();
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
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 16, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}>
      {entries.map((entry, index) => {
        const nextEntry = entries[index + 1];
        // Show connector bar if next entry is not a new leader
        const showConnector = nextEntry !== undefined && !nextEntry.leader;

        const status     = getStatus(entry.artist.artistId);
        const starIcon   = STAR_ICON_INDICATOR[status];

        return (
          <View key={entry.event.eventId}>
            {entry.leader && 
              (<Text style={{ fontSize: 16, color: colors.danger, paddingVertical: 10 }}>
                Overlapping events
              </Text>)
            }
            <TouchableOpacity
              onPress={() => handleCardPress(entry)}
              style={{
                backgroundColor: colors.surface,
                padding: 16,
                marginBottom: showConnector ? 0 : 60,
                borderWidth: 2,
                borderColor: colors.borderMid,
              }}
              activeOpacity={0.75}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    fontFamily: 'Bold-Default',
                  }}>
                    {entry.artist?.name ?? ''}
                  </Text>
                </View>
                {starIcon !== '' && (
                  <Text style={{ fontSize: 14, color: colors.accent, marginLeft: 2 }}>
                    {starIcon}
                  </Text>
                )}
              </View>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {entry.stageName}  ·  {formatDayLabel(entry.event.dateFrom)}  ·  {formatTime(entry.event.dateFrom)}–{formatTime(entry.event.dateTo)}
              </Text>
            </TouchableOpacity>

            {showConnector && (
              <View style={{
                alignSelf: 'center',
                width: 10,
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
