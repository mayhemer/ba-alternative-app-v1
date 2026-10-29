import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text } from '../../ui/Text';
import { Exclamation } from '../../ui/Exclamation';
import { sameProps } from '../../ui/sameProps';
import type { ArtistSetRowModel } from './ArtistSetRow.model';
import type { DbEvent } from '../../types/backend';
import { colors } from '../../styling/tokens';

// ── One of the artist's sets in the sheet ─────────────────────────────────────
//
// Draws its model (ArtistSetRow.model.ts): stage, date and time — a tap goes to
// the set on its timeline — and, while it clashes, the overlap line, which
// opens the clash in the conflict sheet.

type Props = {
  item: ArtistSetRowModel;
  /** Takes the row's model, so one stable callback serves every row. */
  onPress: (row: ArtistSetRowModel) => void;
  onConflict: (event: DbEvent) => void;
};

function ArtistSetRowBase({ item, onPress, onConflict }: Props) {
  return (
    <View
      style={{
        marginHorizontal: item.margin,
        paddingHorizontal: 16,
        marginTop: 10,
        borderLeftWidth: 5,
        borderColor: item.borderColor,
      }}
    >
      <TouchableOpacity onPress={() => onPress(item)} activeOpacity={0.75}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 16, color: colors.textPrimary }}>{item.stage}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>{item.day}</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>·</Text>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>{item.time}</Text>
        </View>
      </TouchableOpacity>
      {item.conflict !== null && (
        <TouchableOpacity
          onPress={() => onConflict(item.event)}
          activeOpacity={0.75}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}
        >
          <Exclamation />
          <Text style={{ color: colors.danger }}>{item.conflict}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const ArtistSetRow = memo(ArtistSetRowBase, sameProps);
