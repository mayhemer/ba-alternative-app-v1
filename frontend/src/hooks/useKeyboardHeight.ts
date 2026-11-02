import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The software keyboard's height while it is up, else 0, for a list that must
 * scroll its last rows clear of it. iOS reports before the keyboard moves,
 * Android once it has.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => { setHeight(e.endCoordinates.height); });
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => { setHeight(0); });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
