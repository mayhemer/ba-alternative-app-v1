import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useScreenUI } from '../../context/ScreenUIContext';

export function TopBar() {
  const { state, dismissFeedback } = useScreenUI();
  const { topBar, feedback } = state;
  const { LeftComponent, RightComponent } = topBar;

  function handleFeedbackTap(): void {
    // progress: not dismissible (operation is still in flight)
    if (feedback?.variant === 'progress') { return; }
    dismissFeedback();
  }

  function renderFeedbackIcon(): React.ReactNode {
    if (feedback === null) { return null; }
    switch (feedback.variant) {
      case 'progress':
        return <ActivityIndicator size="small" color="#e8c84a" style={{ marginRight: 6 }} />;
      case 'confirmation':
        return <Text style={{ color: '#6cf98b', marginRight: 4, fontSize: 13 }}>✓</Text>;
      case 'warning':
        return <Text style={{ color: '#ef4444', marginRight: 4, fontSize: 13 }}>⚠</Text>;
    }
  }

  function feedbackTextColor(): string {
    return 'text-accent';
  }

  return (
    <View className="h-14 flex-row items-center bg-surface border-b border-border px-4">

      {/* Left slot */}
      <View className="w-16 items-start">
        {LeftComponent !== undefined ? <LeftComponent /> : null}
      </View>

      {/* Center — title or FeedbackMessage (no layout shift) */}
      <View className="flex-1 items-center">
        {feedback !== null ? (
          <TouchableOpacity
            onPress={handleFeedbackTap}
            disabled={feedback.variant === 'progress'} // EXPLAIN
            className="flex-row items-center"
          >
            {renderFeedbackIcon()}
            <Text className={`text-sm font-medium tracking-wide ${feedbackTextColor()}`}>
              {feedback.text}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text className="text-textPrimary text-sm font-semibold tracking-widest uppercase">
            {topBar.title}
          </Text>
        )}
      </View>

      {/* Right slot */}
      <View className="w-16 items-end">
        {RightComponent !== undefined ? <RightComponent /> : null}
      </View>

    </View>
  );
}
