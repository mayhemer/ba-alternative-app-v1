import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { useScreenUI } from '../../context/ScreenUIContext';
import { colors } from '../../styling/tokens';

export function FeedbackToast() {
  const { state, dismissFeedback } = useScreenUI();
  const { feedback } = state;
  const { top } = useSafeAreaInsets();

  if (feedback === null) { return null; }

  function handleTap(): void {
    if (feedback?.variant === 'progress') { return; }
    dismissFeedback();
  }

  function renderIcon(): React.ReactNode {
    switch (feedback!.variant) {
      case 'progress':
        return <ActivityIndicator size="small" color={colors.black} />;
      case 'confirmation':
        return <Text style={{ color: '#1a7a3a', fontSize: 13, fontWeight: '700' }}>✓</Text>;
      case 'warning':
        return <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>⚠</Text>;
    }
  }

  return (
    <TouchableOpacity
      onPress={handleTap}
      disabled={feedback.variant === 'progress'}
      activeOpacity={feedback.variant === 'progress' ? 1 : 0.8}
      style={{
        position: 'absolute',
        top: top + 8,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
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
      {/* Fixed-width icon slot prevents text from shifting between variants */}
      <View style={{ width: 22, alignItems: 'center', marginRight: 6 }}>
        {renderIcon()}
      </View>
      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.black }}>
        {feedback.text}
      </Text>
    </TouchableOpacity>
  );
}
