import { Pressable, TouchableOpacity } from 'react-native';
import { colors, HIT_SLOP } from '../../styling/tokens';
import { Text } from './Text';
import Ionicons from '@expo/vector-icons/Ionicons';

export function Exclamation({ size = 14, ...props }) {
  return (
    <Ionicons name={"warning"} size={size} color={colors.danger} {...props}/>
  );
}

type PropsTouchable = {
  size?: number;
  onPress: () => void;
}

export function ExclamationTouchable({ size = 24, onPress, ...props }: PropsTouchable) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP }}
    >
      <Exclamation size={size} {...props} />
    </Pressable>
  );
}
