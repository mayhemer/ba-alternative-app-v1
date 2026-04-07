import React, { useCallback } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from '../components/ui/Text';
import { useInterest } from '../context/InterestContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { useConflicts } from '../context/ConflictContext';
import { formatTime, formatDayLabel } from '../components/timeline/timelineLayout';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { colors, MAX_CONTENT_WIDTH } from '../styling/tokens';
import { STAR_ICON_INDICATOR } from '../components/StarButton';
import type { ConflictEntry } from '../utils/conflictUtils';

export function ConflictsScreen() {
  useTopBar({ title: 'Conflicts' });
  useBottomBar({});

  const { getStatus } = useInterest();
  const { openConflict } = useConflictDetail();
  const { entries } = useConflicts();

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}
    >
      {entries.map((entry, index) => {
        const nextEntry = entries[index + 1];
        const showConnector = nextEntry !== undefined && !nextEntry.leader;
        const status   = getStatus(entry.artist.artistId);
        const starIcon = STAR_ICON_INDICATOR[status];

        return (
          <View key={entry.event.eventId}>
            {entry.leader && (
              <Text style={{ fontSize: 16, color: colors.danger, paddingVertical: 10 }}>
                Overlapping events
              </Text>
            )}
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
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Bold-Default' }}>
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
              <View style={{ alignSelf: 'center', width: 10, height: 16, backgroundColor: colors.borderConflict }} />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}
