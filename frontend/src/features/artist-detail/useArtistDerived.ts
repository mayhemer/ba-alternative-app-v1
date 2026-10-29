import { useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { getFeedbackLabel } from '../interests/StarButton';
import { useArtistDetail as useArtistDetailContext } from './ArtistDetailContext';
import { useInterest } from '../interests/InterestContext';
import { useConflictDetail } from '../conflicts/ConflictDetailContext';
import { useConflicts } from '../conflicts/ConflictContext';
import { useStartProgress } from '../../shell/ScreenUIContext';
import type { ConflictEntry } from '../conflicts/conflictUtils';
import type { DbArtist } from '../../types/backend';
import { MAX_CONTENT_WIDTH } from '../../styling/tokens';
import { useLayoutMode } from '../../hooks/useLayoutMode';

// ── What the artist sheet's header and body read ──────────────────────────────
//
// The contexts both parts of the sheet need, in one place. What they show is
// decided by their elements' models (features/artist-detail/*.model.ts).

export function useArtistDerived(artist: DbArtist) {
  const { closeDetail, expandDetail } = useArtistDetailContext();
  const { getStatus, cycleStatus } = useInterest();
  const { openConflict } = useConflictDetail();
  const { entries } = useConflicts();
  const startProgress = useStartProgress();
  const { width, height, contentPadding } = useLayoutMode();

  const status = getStatus(artist.artistId);
  const innerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const isWeb = Platform.OS === 'web';

  // The artist's clashing sets, from the shared conflict calculation — the one
  // My plan, the timeline's bars and the drawer's count follow.
  const conflicts = useMemo<Map<string, ConflictEntry>>(
    () => new Map(entries.filter((e) => e.event.artistId === artist.artistId).map((e) => [e.event.eventId, e])),
    [entries, artist.artistId],
  );

  const handleStarPress = useCallback((): void => {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next), next).wrap(promise);
  }, [artist.artistId, cycleStatus, startProgress]);

  return { closeDetail, expandDetail, status, innerWidth, hPad: contentPadding, isWeb, width, height, handleStarPress, conflicts, openConflict };
}
