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

  // Read by an effect that must *not* re-run when it changes.
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Mounting is decided while rendering, not in an effect: an effect would let
  // React commit the open state with no sheet in it first, then mount the sheet
  // in a second commit — one render of the whole tree that changes nothing on
  // screen, on every open. Setting state during render instead makes React
  // re-render before anything is committed. The mount index is sampled only
  // here, once: it must not follow later state changes — the library re-snaps
  // the sheet whenever its `index` prop changes, and closing resets the
  // presentation, which would yank the sheet back open mid-close.
  //
  // Safe because every caller clears its open state in the same callback that
  // calls `onClosed`, so a closed sheet is never seen as open and unmounted.
  if (isOpen && mountIndex === null) {
    setMountIndex(openIndex);
  }

  useEffect(() => {
    if (!isOpen) {
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
