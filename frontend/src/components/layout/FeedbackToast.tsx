import React from 'react';
import { ActivityIndicator, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { useScreenUI, type FeedbackVariant } from '../../context/ScreenUIContext';
import { InterestCycleStrip } from '../InterestCycleStrip';
import { feedbackToastModel, toastBand } from './FeedbackToast.model';
import { colors } from '../../styling/tokens';

// ── The feedback toast ────────────────────────────────────────────────────────
//
// Draws its model (FeedbackToast.model.ts): placed in the band clear of the star
// column, showing the interest strip after a star tap, else the message.

export function FeedbackToast() {
  const { state, dismissFeedback } = useScreenUI();
  const { feedback } = state;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  if (feedback === null) { return null; }
  const model = feedbackToastModel(feedback);
  const { content } = model;

  function handleTap(): void {
    if (!model.tappable) { return; }
    dismissFeedback();
  }

  function renderIcon(icon: FeedbackVariant): React.ReactNode {
    switch (icon) {
      case 'progress':
        return <ActivityIndicator testID="feedback-progress" size="small" color={colors.black} />;
      case 'confirmation':
        return <Text style={{ color: '#1a7a3a', fontSize: 13, fontWeight: '700' }}>✓</Text>;
      case 'warning':
        return <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>⚠</Text>;
    }
  }

  const band = toastBand(screenWidth, insets);

  // The band's row pushes its one child to the right edge. That child is at
  // least centeredWidth wide and centres the toast in itself, so a toast that
  // fits sits centred on the screen; a wider one grows the child leftwards and
  // ends at the band's edge. No measuring, so no extra render.
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        // The top inset is 0 in landscape, which would leave the toast flush
        // against the screen edge — keep a floor under it.
        top: Math.max(insets.top, 12) + 12,
        left: band.left,
        width: band.width,
        flexDirection: 'row',
        justifyContent: 'flex-end',
      }}
    >
      <View
        pointerEvents="box-none"
        style={{ minWidth: band.centeredWidth, maxWidth: band.width, alignItems: 'center' }}
      >
        <TouchableOpacity
          testID="feedback-toast"
          onPress={handleTap}
          disabled={!model.tappable}
          activeOpacity={model.tappable ? 0.8 : 1}
          style={{
            maxWidth: band.width,
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 48,
            paddingVertical: 6,
            backgroundColor: colors.white,
            paddingHorizontal: 14,
            borderRadius: 6,
            shadowColor: colors.black,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 6,
            elevation: 8,
          }}
        >
          {content.kind === 'interest' ? (
            // No spinner or tick: they would only track the local write, which is
            // instant, and the star itself already shows the change. A failure
            // still shows, as a warning beside the label.
            <View style={{ marginHorizontal: 6 }}>
              <InterestCycleStrip status={content.status} failed={content.failed} />
            </View>
          ) : (
            <>
              <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.black, marginHorizontal: 6 }}>
                {content.text}
              </Text>
              {/* Fixed-width icon slot prevents text from shifting between variants */}
              <View style={{ width: 22, alignItems: 'center' }}>
                {renderIcon(content.icon)}
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
