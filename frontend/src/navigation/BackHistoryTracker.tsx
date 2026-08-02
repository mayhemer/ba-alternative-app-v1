import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { getDrawerStatusFromState } from '@react-navigation/drawer';
import type { DrawerNavigationState, ParamListBase } from '@react-navigation/native';
import { navigationRef } from './navigationRef';
import {
  goBack,
  observe,
  resetForSlug,
  setAppliers,
  setDepthListener,
  type Position,
  type ScreenName,
} from './backHistory';
import { useSelectedSlug } from '../store/AppContext';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { useLens, useLensPanel } from '../context/LensContext';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { useConflicts } from '../context/ConflictContext';
import { useSocialData } from '../context/SocialContext';
import { getArtists } from '../cache/cacheService';
import type { LensScope } from '../utils/interestUtils';

// The React end of navigation/backHistory: feeds it the current position, tells
// it how to restore one, and owns the back trigger for each platform.
//
// MUST be rendered as a sibling *after* </NavigationContainer>, never inside it
// and never as a bare effect in AppShell. RN calls hardwareBackPress subscribers
// last-registered-first, and NavigationContainer registers its own in an effect.
// Only from this position do its effects flush before ours, leaving us ahead of
// it in the queue — which is what lets the drawer bail-out below hand the press
// back to React Navigation. (AppShell itself is no good: it early-returns before
// NavigationContainer exists while restoring nav state, so an effect there would
// register a whole commit too early.) For the same reason nothing else in the
// app may call BackHandler.addEventListener.

// Read rather than remembered: NavigationContainer does not fire onStateChange
// for its initial (restored) state, so AppShell alone would never report the
// screen the app started on. Carrying it on every observation also makes the
// value immune to the order effects happen to mount in.
function currentScreen(): ScreenName | undefined {
  if (!navigationRef.isReady()) {
    return undefined;
  }
  const state = navigationRef.getRootState();
  return state.routes[state.index]?.name as ScreenName | undefined;
}

function isDrawerOpen(): boolean {
  if (!navigationRef.isReady()) {
    return false;
  }
  const state = navigationRef.getRootState() as DrawerNavigationState<ParamListBase>;
  if (state.history === undefined) {
    return false;
  }
  return getDrawerStatusFromState(state) === 'open';
}

export function BackHistoryTracker() {
  const selectedSlug = useSelectedSlug();
  const { selectedDayStart, setSelectedDayStart } = useTimelineFilter();
  const { scope, setScope } = useLens();
  const { isOpen: isLensPanelOpen, close: closeLensPanel } = useLensPanel();
  const { detailState, openDetail, closeDetail } = useArtistDetail();
  const { conflictState, openConflict, closeConflict } = useConflictDetail();
  const { entries } = useConflicts();
  const { getFriend } = useSocialData();

  // Everything the appliers and the back chain need, held in one ref so they can
  // register once and still see current values (the idiom from
  // hooks/useExclusiveOverlay).
  const snapshot = {
    selectedSlug, setSelectedDayStart, setScope,
    openDetail, closeDetail, openConflict, closeConflict, entries, getFriend,
    isLensPanelOpen, closeLensPanel,
    isArtistOpen: detailState.artist !== null,
    isConflictOpen: conflictState.sourceEvent !== null,
  };
  const live = useRef(snapshot);
  live.current = snapshot;

  // Declared before the observer so a festival-edition switch clears the stack
  // before anything from the new edition is recorded.
  useEffect(() => { resetForSlug(selectedSlug); }, [selectedSlug]);

  useEffect(() => {
    const patch: Partial<Position> = {
      day: selectedDayStart,
      scope,
      artistId: detailState.artist?.artistId ?? null,
      presentation: detailState.presentation,
      conflictEventId: conflictState.sourceEvent?.eventId ?? null,
    };
    const screen = currentScreen();
    if (screen !== undefined) {
      patch.screen = screen;
    }
    observe(patch);
  }, [selectedDayStart, scope, detailState, conflictState]);

  // ── Restoring a position ────────────────────────────────────────────────────

  useEffect(() => setAppliers({
    applyScreen: (screen: ScreenName): void => {
      if (navigationRef.isReady()) {
        navigationRef.navigate(screen);
      }
    },

    applyDay: (day: number): void => {
      live.current.setSelectedDayStart(day);
    },

    // A friend removed since this position was recorded is the same stale
    // reference as a dropped artist: fall back to the unfiltered lens rather
    // than point the app at a schedule that is gone.
    applyScope: (next) => {
      if (next.kind === 'friend' && live.current.getFriend(next.token) === undefined) {
        const fallback: LensScope = { kind: 'all' };
        live.current.setScope(fallback);
        return fallback;
      }
      live.current.setScope(next);
      return next;
    },

    // Ids are re-resolved against the live cache, so an artist a refresh has
    // dropped simply leaves the sheet closed — the rest of the position still
    // restores.
    applyArtist: (artistId, presentation): string | null => {
      if (artistId === null) {
        live.current.closeDetail();
        return null;
      }
      const artist = getArtists(live.current.selectedSlug).find((a) => a.artistId === artistId);
      if (artist === undefined) {
        live.current.closeDetail();
        return null;
      }
      live.current.openDetail(artist, presentation);
      return artistId;
    },

    // Overlapping events are re-derived rather than stored: ConflictContext
    // applies the same must_see rule both openConflict callers use, so this
    // reproduces either of them — and yields nothing once the user un-stars.
    applyConflict: (eventId): string | null => {
      if (eventId === null) {
        live.current.closeConflict();
        return null;
      }
      const entry = live.current.entries.find((e) => e.event.eventId === eventId);
      if (entry === undefined) {
        live.current.closeConflict();
        return null;
      }
      live.current.openConflict(entry.event, entry.overlappingEvents);
      return eventId;
    },
  }), []);

  // ── Dismissal chain ─────────────────────────────────────────────────────────

  // Closes the topmost overlay, in the order AppShell stacks them. Neither the
  // drawer nor the lens panel is a *position* — you are never returned to one
  // open — but the lens panel still has to be closed on the way past, or back
  // would navigate out from under it and leave it floating over another screen.
  const dismissTopmost = useCallback((): boolean => {
    const l = live.current;
    if (l.isConflictOpen) { l.closeConflict(); return true; }
    if (l.isArtistOpen) { l.closeDetail(); return true; }
    if (l.isLensPanelOpen) { l.closeLensPanel(); return true; }
    return false;
  }, []);

  // ── Native trigger ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS === 'web') { return; }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // The drawer is left entirely to React Navigation, which already pops it
      // out of the navigator's own history — returning false hands it the press.
      if (isDrawerOpen()) { return false; }
      if (live.current.isLensPanelOpen) { live.current.closeLensPanel(); return true; }
      return goBack();
    });
    return () => sub.remove();
  }, []);

  // ── Web triggers ────────────────────────────────────────────────────────────

  // Mirror the stack depth into browser history so the browser's back button
  // walks the same positions. Our stack is authoritative; the browser entries
  // only exist to catch the press. Depth changes by at most one per commit, so
  // no multi-level reconciliation is needed.
  useEffect(() => {
    if (Platform.OS !== 'web') { return; }
    const history = globalThis.history as History | undefined;
    if (history === undefined) { return; }

    let mirrored = 0;
    // history.back() is async and comes back as a popstate we must not act on.
    let selfPops = 0;

    const stopListening = setDepthListener((depth: number): void => {
      while (mirrored < depth) {
        mirrored += 1;
        history.pushState({ baDepth: mirrored }, '', globalThis.location.href);
      }
      while (mirrored > depth) {
        mirrored -= 1;
        selfPops += 1;
        history.back();
      }
    });

    function handlePopState(): void {
      if (selfPops > 0) { selfPops -= 1; return; }
      mirrored = Math.max(0, mirrored - 1);
      goBack();
    }

    window.addEventListener('popstate', handlePopState);
    return () => {
      stopListening();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Escape dismisses the topmost overlay. One listener owns the order, so the
  // sheets no longer need a capture-phase listener and stopPropagation to
  // out-rank each other. preventDefault stays: Escape's browser default aborts
  // in-flight requests, which on the artist sheet means its pending images.
  useEffect(() => {
    if (Platform.OS !== 'web') { return; }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key !== 'Escape') { return; }
      if (dismissTopmost()) { e.preventDefault(); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dismissTopmost]);

  return null;
}
