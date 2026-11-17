import { Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { PULL_PAST_TOP_ENABLED } from '../../src/ui/PullPreview.model';

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
 * A case about the pull: run on iOS only, the one platform with a pull
 * (ui/PullPreview); Android and web have none. Skipped everywhere while the
 * pull is switched off (PULL_PAST_TOP_ENABLED).
 */
export const itPullsOnIos = PULL_PAST_TOP_ENABLED && Platform.OS === 'ios' ? it : it.skip;

/**
 * Pulls the scroller with this testID down past its top and lets go, as a
 * finger does on iOS (ui/PullPreview): a drag from the top, the content 120 pt
 * past it (past every pull preview's height, ui/PullPreview.model), the release.
 */
export async function pullPastTop(testID: string): Promise<void> {
  const scroller = screen.getByTestId(testID);
  await act(async () => { fireEvent(scroller, 'scrollBeginDrag', at(0)); });
  await act(async () => { fireEvent.scroll(scroller, at(-120)); });
  await act(async () => { fireEvent(scroller, 'scrollEndDrag', at(-120)); });
}
