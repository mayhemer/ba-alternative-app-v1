import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type BottomSheet from '@gorhom/bottom-sheet';

/**
 * Mount/unmount lifecycle for a @gorhom/bottom-sheet driven by app state.
 *
 * The sheet is kept out of the tree entirely while it has nothing to show, which
 * works around an upstream bug (still present in 5.2.14): the library never
 * re-evaluates a *closed* sheet's resting position when its container is
 * resized. `getEvaluatedPosition` ends at `detents[currentIndex]`, and the
 * closed index is -1, so it returns `undefined` and `evaluatePosition` bails out
 * before it can re-park the sheet. A sheet closed on a phone in landscape
 * therefore stays parked at the landscape container height — which, after a
 * rotation to portrait, sits half-way up the now much taller container, leaving
 * an empty panel on screen. (The opposite rotation hides the flaw: the stale
 * portrait height is below the shorter landscape container.)
 *
 * Opening is expressed as the sheet's mount `index` rather than an imperative
 * `snapToIndex`, because a freshly mounted sheet drops `snapToIndex` calls until
 * its layout has been measured.
 *
 * @param isOpen    whether the sheet has something to show.
 * @param openIndex snap point index to open at — read once, as the sheet mounts.
 * @param sheetRef  the sheet, used to play its closing animation.
 * @returns `mountIndex`, the sheet's `index` prop — or null while the sheet must
 *          not be rendered at all — and `onClosed`, to wire to the sheet's
 *          `onClose` so the unmount waits for the closing animation.
 */
export function useBottomSheetMount(
  isOpen: boolean,
  openIndex: number,
  sheetRef: RefObject<BottomSheet | null>,
): { mountIndex: number | null; onClosed: () => void } {
  const [mountIndex, setMountIndex] = useState<number | null>(null);
  const { width, height } = useWindowDimensions();

  // Both held in refs. The mount index is sampled once and must not follow later
  // state changes — the library re-snaps the sheet whenever its `index` prop
  // changes, and closing resets the presentation, which would yank the sheet
  // back open mid-close. `isOpen` is read by an effect that must *not* re-run
  // when it changes.
  const openIndexRef = useRef(openIndex);
  openIndexRef.current = openIndex;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  useEffect(() => {
    if (isOpen) {
      setMountIndex((current) => (current === null ? openIndexRef.current : current));
    } else {
      // The unmount itself waits for `onClosed`, so this animation can play out.
      sheetRef.current?.close();
    }
  }, [isOpen, sheetRef]);

  // Safety net for the bug described above: a close can go unreported, because
  // `close()` does nothing if the sheet was dismissed before its first layout.
  // On a viewport change, drop a sheet that has nothing to show outright rather
  // than let it resurface at the new size.
  useEffect(() => {
    if (!isOpenRef.current) {
      setMountIndex(null);
    }
  }, [width, height]);

  const onClosed = useCallback((): void => { setMountIndex(null); }, []);

  return { mountIndex, onClosed };
}
