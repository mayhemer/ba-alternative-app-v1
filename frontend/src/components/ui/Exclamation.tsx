import { colors } from '../../styling/tokens';
import { Text } from './Text';

export function Exclamation() {
  return (
    <Text style={{ fontSize: 10, backgroundColor: colors.danger, borderRadius: 8, padding: 0, width: 15, textAlign: 'center' }}>
      !
    </Text>
  );
}
