import React from 'react';
import { ActivityIndicator, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { useScreenUI } from '../../context/ScreenUIContext';
import { InterestCycleStrip } from '../InterestCycleStrip';
import { STAR_COLUMN_RESERVE } from '../StarButton';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';

const TOAST_GUTTER = 12;

/**
 * The horizontal band a toast may occupy. It is shown right after a star tap,
 * and the star buttons sit at the right end of their rows — the artist list and
 * the detail header, which an expanded sheet lifts into the toast's own height —
 * so the band stops short of the star column.
 *
 * `centeredWidth` is the widest a toast can be and still sit centred on the
 * screen inside the band: a span centred on the screen, ending at the band's
 * right edge. A toast that fits is centred; a wider one moves left only as far
 * as it must.
 */
export function toastBand(
  screenWidth: number,
  insets: { left: number; right: number },
): { left: number; width: number; centeredWidth: number } {
  const columnWidth = Math.min(screenWidth, MAX_CONTENT_WIDTH);
  const columnLeft = (screenWidth - columnWidth) / 2;
  const left = Math.max(columnLeft, insets.left) + TOAST_GUTTER;
  const right = Math.min(columnLeft + columnWidth, screenWidth - insets.right) - STAR_COLUMN_RESERVE;
  const width = Math.max(0, right - left);
  const centeredWidth = Math.max(0, Math.min(2 * (right - screenWidth / 2), width));
  return { left, width, centeredWidth };
}

export function FeedbackToast() {
  const { state, dismissFeedback } = useScreenUI();
  const { feedback } = state;
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  if (feedback === null) { return null; }

  function handleTap(): void {
    if (feedback?.variant === 'progress') { return; }
    dismissFeedback();
  }

  function renderIcon(): React.ReactNode {
    switch (feedback!.variant) {
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
          disabled={feedback.variant === 'progress'}
          activeOpacity={feedback.variant === 'progress' ? 1 : 0.8}
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
          {feedback.interest !== undefined ? (
            // No spinner or tick: they would only track the local write, which is
            // instant, and the star itself already shows the change. A failure
            // still shows, as a warning beside the label.
            <View style={{ marginHorizontal: 6 }}>
              <InterestCycleStrip status={feedback.interest} failed={feedback.variant === 'warning'} />
            </View>
          ) : (
            <>
              <Text style={{ flexShrink: 1, fontSize: 13, fontWeight: '700', color: colors.black, marginHorizontal: 6 }}>
                {feedback.text}
              </Text>
              {/* Fixed-width icon slot prevents text from shifting between variants */}
              <View style={{ width: 22, alignItems: 'center' }}>
                {renderIcon()}
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
