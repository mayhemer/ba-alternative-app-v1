import React from 'react';
import { Text as RNText, type TextProps } from 'react-native';

// Drop-in replacement for React Native's Text with the app default font applied.
// Set fontFamily here once; all usages inherit it automatically.

const DEFAULT_STYLE = {
  fontFamily: 'Regular-Default',
};

export function Text({ style, ...props }: TextProps) {
  return <RNText style={[DEFAULT_STYLE, style]} {...props} />;
}
