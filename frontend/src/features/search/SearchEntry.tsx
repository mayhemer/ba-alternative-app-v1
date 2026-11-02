import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { useSearch } from './SearchContext';
import { searchStrings } from './searchStrings';
import { colors } from '../../styling/tokens';

// ── The search field at the top of the lens and filter panels ─────────────────
//
// Looks like a field, opens the search (SearchView), which takes its place;
// the panel closes behind it through the exclusivity hub.

export const SEARCH_ENTRY = { height: 42, radius: 10, iconSize: 18 } as const;

export function SearchEntry() {
  const { open } = useSearch();
  const handlePress = useCallback((): void => { open(); }, [open]);
  return (
    <Pressable
      testID="search-entry"
      onPress={handlePress}
      accessibilityRole="search"
      accessibilityLabel={searchStrings.entry}
      style={{
        height: SEARCH_ENTRY.height,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        borderRadius: SEARCH_ENTRY.radius,
        borderWidth: 1,
        borderColor: colors.borderMid,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <Ionicons name="search" size={SEARCH_ENTRY.iconSize} color={colors.muted} />
      <Text style={{ fontSize: 15, color: colors.muted }}>{searchStrings.entry}</Text>
    </Pressable>
  );
}
