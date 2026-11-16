import React, { memo } from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { LIST_GUTTER } from './planStyles';
import { sameProps } from '../../ui/sameProps';
import type { PlanEmptyAction, PlanEmptyModel, PlanEmptyPart } from './PlanEmpty.model';
import { colors } from '../../styling/tokens';

// ── An empty day ──────────────────────────────────────────────────────────────
//
// Centred. The links sit inside the sentence (nested Text), so it wraps as
// one text in either language; each link is its own accessibility element. The filter
// link ends with the top-bar filter button's glyph and dots, in their colours
// there, so the user knows the button when the panel opens under it.

const TITLE_TEXT = { fontSize: 17, fontFamily: 'Bold-Default', color: colors.textPrimary, textAlign: 'center' as const, marginBottom: 6 };
const SENTENCE_TEXT = { fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: 'center' as const };
const LINK_TEXT = { color: colors.accent, fontFamily: 'Bold-Default' };
const GLYPH_SIZE = 15;

type Props = {
  item: PlanEmptyModel;
  onAction: (action: PlanEmptyAction) => void;
};

function Link({ part, action, onAction }: { part: PlanEmptyPart; action: PlanEmptyAction; onAction: Props['onAction'] }) {
  return (
    <Text style={LINK_TEXT} accessibilityRole="link" accessibilityLabel={part.text} onPress={() => { onAction(action); }}>
      {part.text}
      {part.glyph !== null && (
        <>
          {' '}
          <Ionicons testID={`plan-empty-glyph-${part.glyph.icon}`} name={part.glyph.icon} size={GLYPH_SIZE} color={part.glyph.color} />
          <Ionicons testID="plan-empty-glyph-dots" name="ellipsis-vertical" size={GLYPH_SIZE} color={colors.textPrimary} />
        </>
      )}
    </Text>
  );
}

function PlanEmptyBase({ item, onAction }: Props) {
  return (
    <View style={{ height: item.height, alignItems: 'center', justifyContent: 'center', paddingHorizontal: LIST_GUTTER }}>
      {item.title !== null && <Text style={TITLE_TEXT}>{item.title}</Text>}
      {item.intro !== null && <Text style={SENTENCE_TEXT}>{item.intro}</Text>}
      <Text style={SENTENCE_TEXT}>
        {item.parts.map((part, i) => (
          part.action === null ? part.text : <Link key={i} part={part} action={part.action} onAction={onAction} />
        ))}
      </Text>
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const PlanEmpty = memo(PlanEmptyBase, sameProps);
