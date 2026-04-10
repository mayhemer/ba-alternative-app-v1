import { Pressable } from 'react-native';
import { colors } from '../../styling/tokens';
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
      hitSlop={15}
    >
      <Exclamation size={size} {...props} />
    </Pressable>
  );
}
