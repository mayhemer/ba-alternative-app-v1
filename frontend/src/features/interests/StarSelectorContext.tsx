import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useInterest, useInterestCycle, type InterestStatus } from './InterestContext';
import {
  starSelectorCapsule,
  touchesCapsule,
  touchesStar,
  STAR_SELECTOR_TIMEOUT_MS,
  type StarFrame,
  type StarSize,
} from './StarSelector.model';

// ── The star selector's state ─────────────────────────────────────────────────
//
// Which star the selector is open on, and when it closes: 1.8 s after the last
// tap, never while a finger is on it, never after a failed save (that stays
// until dismissed), at once on a touch anywhere off it and off its star
// (AppShell reports every touch) or when the list scrolls. A star press turns
// the pick one step and opens it, from the state before; pressed again while
// open, the same selector stays and follows. In it, a state tap sets that state.

/** What a star button hands over: something that can say where it is on screen. */
export type MeasurableStar = {
  measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void;
};

export type StarPress = { artistId: string; size: StarSize; star: MeasurableStar | null };

export type OpenStarSelector = {
  /** New for each opening: the selector grows out of the star again. */
  id: number;
  artistId: string;
  size: StarSize;
  frame: StarFrame;
  /** The state before the press: the ring starts there and moves to the new one. */
  from: InterestStatus;
  failed: boolean;
};

type Actions = {
  /** A star button was pressed: one step on, and open beside it. */
  pressStar: (press: StarPress) => void;
  /** A state tapped in the selector. */
  select: (status: InterestStatus) => void;
  close: () => void;
  /** Every touch in the app, in window coordinates: one off the selector closes it. */
  closeOnTouchOutside: (x: number, y: number) => void;
  /** A finger went down on the selector, or lifted. */
  hold: () => void;
  release: () => void;
};

const ActionsContext = createContext<Actions | null>(null);
const StateContext = createContext<OpenStarSelector | null>(null);

export function StarSelectorProvider({ children }: { children: React.ReactNode }) {
  const { cycleStatus, setStatus } = useInterestCycle();
  const { getStatus } = useInterest();
  // Read at press time, without making pressStar change with every pick.
  const getStatusRef = useRef(getStatus);
  getStatusRef.current = getStatus;
  const openingsRef = useRef(0);
  const [open, setOpen] = useState<OpenStarSelector | null>(null);
  // Mirrors `open` for the actions, which stay stable and so cannot read state.
  const openRef = useRef<OpenStarSelector | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);

  const update = useCallback((next: OpenStarSelector | null): void => {
    openRef.current = next;
    setOpen(next);
  }, []);

  const clearTimer = useCallback((): void => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback((): void => {
    clearTimer();
    heldRef.current = false;
    if (openRef.current !== null) { update(null); }
  }, [clearTimer, update]);

  /** Starts the wait again from now, unless a finger is down or the save failed. */
  const restartTimer = useCallback((): void => {
    clearTimer();
    if (heldRef.current || openRef.current === null || openRef.current.failed) { return; }
    timerRef.current = setTimeout(close, STAR_SELECTOR_TIMEOUT_MS);
  }, [clearTimer, close]);

  /** Marks the selector failed if this save fails while it is still open on that artist. */
  const watchSave = useCallback((artistId: string, save: Promise<unknown>, onFail: () => void): void => {
    save.catch(() => {
      onFail();
      const current = openRef.current;
      if (current !== null && current.artistId === artistId) {
        clearTimer();
        update({ ...current, failed: true });
      }
    });
  }, [clearTimer, update]);

  const pressStar = useCallback(({ artistId, size, star }: StarPress): void => {
    const current = openRef.current;
    if (current !== null && current.artistId === artistId) {
      // Its own star again: the same selector stays, and its ring follows.
      if (current.failed) { update({ ...current, failed: false }); }
      watchSave(artistId, cycleStatus(artistId).promise, () => undefined);
      restartTimer();
      return;
    }
    const from = getStatusRef.current(artistId);
    const { promise } = cycleStatus(artistId);
    // The measurement may come back after the save has already failed.
    let failed = false;
    watchSave(artistId, promise, () => { failed = true; });
    star?.measureInWindow((x, y, width, height) => {
      if (![x, y, width, height].every(Number.isFinite)) { return; }
      openingsRef.current += 1;
      update({ id: openingsRef.current, artistId, size, frame: { x, y, width, height }, from, failed });
      restartTimer();
    });
  }, [cycleStatus, watchSave, update, restartTimer]);

  const select = useCallback((status: InterestStatus): void => {
    const current = openRef.current;
    if (current === null) { return; }
    if (current.failed) { update({ ...current, failed: false }); }
    watchSave(current.artistId, setStatus(current.artistId, status).promise, () => undefined);
    restartTimer();
  }, [update, watchSave, setStatus, restartTimer]);

  const closeOnTouchOutside = useCallback((x: number, y: number): void => {
    const current = openRef.current;
    if (current === null) { return; }
    // A touch on its own star is the star's: it turns the pick, and the selector stays.
    const onSelector = touchesCapsule(starSelectorCapsule(current.frame, current.size), x, y)
      || touchesStar(current.frame, current.size, x, y);
    if (!onSelector) { close(); }
  }, [close]);

  const hold = useCallback((): void => {
    heldRef.current = true;
    clearTimer();
  }, [clearTimer]);

  const release = useCallback((): void => {
    heldRef.current = false;
    restartTimer();
  }, [restartTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const actions = useMemo(
    () => ({ pressStar, select, close, closeOnTouchOutside, hold, release }),
    [pressStar, select, close, closeOnTouchOutside, hold, release],
  );

  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={open}>
        {children}
      </StateContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Stable: never re-renders its user. For star buttons, lists and the app shell. */
export function useStarSelectorActions(): Actions {
  const ctx = useContext(ActionsContext);
  if (ctx === null) {
    throw new Error('useStarSelectorActions must be used inside StarSelectorProvider');
  }
  return ctx;
}

/** The open selector, or null. Only the selector itself reads it. */
export function useOpenStarSelector(): OpenStarSelector | null {
  return useContext(StateContext);
}
