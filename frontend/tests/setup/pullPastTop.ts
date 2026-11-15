import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';

/** A scroll event with the content at `y` (negative: pulled down past its top). */
function at(y: number) {
  return {
    nativeEvent: {
      contentOffset: { x: 0, y },
      contentInset: { top: 0, left: 0, bottom: 0, right: 0 },
      contentSize: { width: 390, height: 2000 },
      layoutMeasurement: { width: 390, height: 700 },
    },
  };
}

/**
 * Pulls the scroller with this testID down past its top and lets go, as a
 * finger does on the platform under test (ui/PullPreview). On iOS: a drag
 * from the top, the content 120 pt past it (past every pull preview's
 * height, ui/PullPreview.model), the release. On Android the platform's pull control fires; the
 * test renderer has no gestures, so its handler is called as the native pull
 * calls it.
 */
export async function pullPastTop(testID: string): Promise<void> {
  const scroller = screen.getByTestId(testID);
  if (Platform.OS === 'android') {
    const control = scroller.props.refreshControl as ReactElement<{ onRefresh?: () => void }> | undefined;
    const onRefresh = control?.props.onRefresh;
    if (onRefresh === undefined) {
      throw new Error(`"${testID}" has no pull control`);
    }
    await act(async () => { onRefresh(); });
    return;
  }
  await act(async () => { fireEvent(scroller, 'scrollBeginDrag', at(0)); });
  await act(async () => { fireEvent.scroll(scroller, at(-120)); });
  await act(async () => { fireEvent(scroller, 'scrollEndDrag', at(-120)); });
}
