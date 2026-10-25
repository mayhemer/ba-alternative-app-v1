import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../ui/Text';
import { StarButton } from '../StarButton';
import { ExclamationTouchable } from '../ui/Exclamation';
import { sameProps } from '../sameProps';
import { TITLE_LAYOUT, type ArtistDetailTitleModel } from './ArtistDetailTitle.model';
import { colors } from '../../styling/tokens';

// ── The artist sheet's title row ──────────────────────────────────────────────
//
// Draws its model (ArtistDetailTitle.model.ts): the name, the ⚠ while a set
// clashes (expands the sheet), the star, the ✕ on web; genre · country below.

type Props = {
  item: ArtistDetailTitleModel;
  onStar: () => void;
  onExpand: () => void;
  onClose: () => void;
};

function ArtistDetailTitleBase({ item, onStar, onExpand, onClose }: Props) {
  return (
    <View style={{
      alignSelf: 'center',
      width: item.width,
      paddingHorizontal: item.padding,
      paddingTop: 12,
      paddingBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text
          numberOfLines={TITLE_LAYOUT.lines}
          style={{
            color: colors.textPrimary,
            flex: 1,
            fontSize: item.fontSize,
            fontWeight: '700',
            fontFamily: 'Bold-Default',
            marginRight: TITLE_LAYOUT.marginRight,
          }}
        >
          {item.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: TITLE_LAYOUT.gap }}>
          {item.showConflict && <ExclamationTouchable onPress={onExpand} />}
          <StarButton status={item.status} onPress={onStar} label="Toggle interest" size="large" />
          {item.showClose && (
            <TouchableOpacity onPress={onClose} hitSlop={8} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 20, color: colors.textSecondary, lineHeight: 36 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {item.meta !== '' && (
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
          {item.meta}
        </Text>
      )}
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const ArtistDetailTitle = memo(ArtistDetailTitleBase, sameProps);
