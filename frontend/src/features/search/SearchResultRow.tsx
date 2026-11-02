import React, { memo, useCallback, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { Text } from '../../ui/Text';
import { sameProps } from '../../ui/sameProps';
import { StarGlyph } from '../interests/StarButton';
import { SEARCH_ROW, type SearchResultRowModel } from './SearchResultRow.model';
import { colors } from '../../styling/tokens';

// ── A search result row ───────────────────────────────────────────────────────
//
// Draws its model (SearchResultRow.model.ts). Takes its own key back on a press,
// so one stable callback serves every row. The pressed look is state, not a
// style function: NativeWind drops a Pressable's function style on native.

type Props = {
  item: SearchResultRowModel;
  onPress: (key: string) => void;
};

const ROW_STYLE: ViewStyle = {
  flexDirection: 'row',
  alignItems: 'stretch',
  backgroundColor: colors.surface,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: SEARCH_ROW.radius,
  overflow: 'hidden',
};
const PRESSED_STYLE: ViewStyle = { backgroundColor: colors.surfacePressed };

function SearchResultRowBase({ item, onPress }: Props) {
  const [pressed, setPressed] = useState(false);
  const pressIn = useCallback((): void => { setPressed(true); }, []);
  const pressOut = useCallback((): void => { setPressed(false); }, []);
  const handlePress = useCallback((): void => { onPress(item.key); }, [onPress, item.key]);
  return (
    <Pressable
      testID={`search-row-${item.key}`}
      onPress={handlePress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      style={[ROW_STYLE, { height: item.height }, pressed && PRESSED_STYLE]}
    >
      {/* Without a category, the bar's place stays, empty, so the text lines up. */}
      <View style={{ width: SEARCH_ROW.barWidth, backgroundColor: item.barColor ?? undefined }} />
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center', paddingLeft: 10, paddingRight: 6, gap: 3 }}>
        <Text numberOfLines={1} style={{ fontSize: SEARCH_ROW.nameSize, color: colors.textPrimary, fontFamily: 'Bold-Default' }}>
          {item.nameBefore}
          <Text style={{ color: colors.accent, fontFamily: 'Bold-Default' }}>{item.nameMatch}</Text>
          {item.nameAfter}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: SEARCH_ROW.metaSize + 4 }}>
          {item.meta !== null && (
            <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: SEARCH_ROW.metaSize, color: colors.textMuted, fontVariant: ['tabular-nums'] }}>
              {item.meta}
            </Text>
          )}
          {item.tag !== null && (
            <Text
              numberOfLines={1}
              style={{ flexShrink: 0, fontSize: 11, color: colors.breakBlue, borderWidth: 1, borderColor: colors.breakBlue, borderRadius: 4, paddingHorizontal: 5 }}
            >
              {item.tag}
            </Text>
          )}
        </View>
      </View>
      <View style={{ width: SEARCH_ROW.starSize + 24, alignItems: 'center', justifyContent: 'center' }}>
        {item.status !== 'none' && (
          <View style={{ width: SEARCH_ROW.starSize, height: SEARCH_ROW.starSize }}>
            <StarGlyph status={item.status} size={SEARCH_ROW.starSize} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const SearchResultRow = memo(SearchResultRowBase, sameProps);
