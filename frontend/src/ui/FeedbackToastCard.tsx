import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { Text } from './Text';
import { useScreenUI, type FeedbackAnchor, type FeedbackVariant } from '../shell/ScreenUIContext';
import { feedbackToastModel, type FeedbackToastModel } from './FeedbackToastCard.model';
import { colors, FLOATING_SHADOW } from '../styling/tokens';

// ── The feedback toast's card ─────────────────────────────────────────────────
//
// Draws its model (FeedbackToastCard.model.ts): the message and its icon. Placed
// under the top bar by shell/FeedbackToast, or (SectionFeedbackToast) in the
// section whose action it reports.

const CARD_STYLE = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  minHeight: 48,
  paddingVertical: 4.5,
  paddingHorizontal: 10.5,
  // Light and square-cornered, dark text on it: apart from the dark screen under it.
  backgroundColor: colors.infoSurface,
  boxShadow: FLOATING_SHADOW,
};
/** In a panel heading: shorter, so it doesn't spill over the rows around it. */
const COMPACT_CARD_STYLE = { ...CARD_STYLE, minHeight: 36, paddingVertical: 3, paddingHorizontal: 7.5 };

const MESSAGE_STYLE = { flexShrink: 1, fontSize: 13, fontWeight: '700' as const, color: colors.infoText, marginHorizontal: 6 };

function renderIcon(icon: FeedbackVariant): React.ReactNode {
  switch (icon) {
    case 'progress':
      return <ActivityIndicator testID="feedback-progress" size="small" color={colors.infoText} />;
    case 'confirmation':
      return <Text style={{ color: colors.infoSuccess, fontSize: 13, fontWeight: '700' }}>✓</Text>;
    case 'warning':
      return <Text style={{ color: colors.infoDanger, fontSize: 13, fontWeight: '700' }}>⚠</Text>;
  }
}

export function FeedbackToastCard({ model, onDismiss, maxWidth, compact = false }: {
  model: FeedbackToastModel;
  onDismiss: () => void;
  maxWidth?: number;
  compact?: boolean;
}) {
  const { content } = model;
  return (
    <TouchableOpacity
      testID="feedback-toast"
      onPress={model.tappable ? onDismiss : undefined}
      disabled={!model.tappable}
      activeOpacity={model.tappable ? 0.8 : 1}
      style={[compact ? COMPACT_CARD_STYLE : CARD_STYLE, { maxWidth }]}
    >
      <Text style={MESSAGE_STYLE}>{content.text}</Text>
      {/* Fixed-width icon slot prevents text from shifting between variants */}
      <View style={{ width: 22, alignItems: 'center' }}>
        {renderIcon(content.icon)}
      </View>
    </TouchableOpacity>
  );
}

/**
 * The toast for a message anchored to a section (FeedbackAnchor), drawn where
 * the section places it — in "My schedule", on its heading's line.
 */
export function SectionFeedbackToast({ section }: { section: FeedbackAnchor['kind'] }) {
  const { state, dismissFeedback } = useScreenUI();
  const { feedback } = state;

  if (feedback === null || feedback.anchor?.kind !== section) { return null; }
  return <FeedbackToastCard model={feedbackToastModel(feedback)} onDismiss={dismissFeedback} compact />;
}
