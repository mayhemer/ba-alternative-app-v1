import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { useSearch } from './SearchContext';
import { SEARCH_ENTRY, searchEntryFrame } from './SearchDock.model';
import { searchStrings } from './searchStrings';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { colors } from '../../styling/tokens';

// ── The search field the lens and filter panels show at the bottom edge ───────
//
// The open search's pill, without its accent frame, a little higher, so it is
// not missed (SearchDock.model.ts). A tap opens the
// search (SearchView), whose field rises onto the keyboard; the panel closes
// behind it through the exclusivity hub.
// Drawn by a panel after its backdrop, so it sits over it.

/** The open field's shadow, which the entry shares: both float over the dimmed screen. */
export const SEARCH_FIELD_SHADOW = '0px 4px 18px rgba(0, 0, 0, 0.6)';

export function SearchEntry() {
  const { open } = useSearch();
  const { isWide } = useLayoutMode();
  const handlePress = useCallback((): void => { open(); }, [open]);
  return (
    <Pressable
      testID="search-entry"
      onPress={handlePress}
      accessibilityRole="search"
      accessibilityLabel={searchStrings.entry}
      style={{
        position: 'absolute',
        ...searchEntryFrame({ isWide }),
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        borderWidth: 1,
        borderColor: colors.borderMid,
        backgroundColor: colors.surfaceRaised,
        boxShadow: SEARCH_FIELD_SHADOW,
      }}
    >
      <Ionicons name="search" size={SEARCH_ENTRY.iconSize} color={colors.textMuted} />
      <Text style={{ fontSize: 16, color: colors.muted }}>{searchStrings.entry}</Text>
    </Pressable>
  );
}
