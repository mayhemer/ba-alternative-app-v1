import { useMemo } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { getFeedbackLabel } from '../components/StarButton';
import { useArtistDetail as useArtistDetailContext } from '../context/ArtistDetailContext';
import { useInterest } from '../context/InterestContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { getArtistLocalized } from '../utils/localization';
import { useStartProgress, useFeedback } from '../context/ScreenUIContext';
import { getArtistEvents, getArtists } from '../cache/cacheService';
import { eventsOverlap } from '../utils/conflictUtils';
import { useAppState } from '../store/AppContext';
import type { DbArtist, DbEvent } from '../types/backend';
import { MAX_CONTENT_WIDTH, PADDING_BREAKPOINT } from '../styling/tokens';

// ── Shared derived values ─────────────────────────────────────────────────────

export function useArtistDerived(artist: DbArtist) {
  const { closeDetail } = useArtistDetailContext();
  const { interests, getStatus, cycleStatus } = useInterest();
  const { openConflict } = useConflictDetail();
  const { selectedSlug } = useAppState();
  const startProgress = useStartProgress();
  const showFeedback  = useFeedback();
  const { width } = useWindowDimensions();

  const status  = getStatus(artist.artistId);
  const genre   = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  const content = getArtistLocalized(artist.localized, 'content');

  const innerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const hPad       = width >= PADDING_BREAKPOINT ? 0 : 16;
  const isWeb      = Platform.OS === 'web';
  const meta       = [genre, country].filter(Boolean).join('  ·  ');

  const artistNameForURL = encodeURIComponent(artist.name.toLocaleLowerCase());
  let artistWebDomain = '';
  try {
    if (artist.url !== '') { artistWebDomain = new URL(artist.url).hostname.replace(/^www\./, ''); }
  } catch (_) { /* invalid URL */ }

  // Per-event conflict map: eventId → overlapping events from other marked artists.
  const conflictMap = useMemo<Map<string, DbEvent[]>>(() => {
    const map = new Map<string, DbEvent[]>();
    const localInterest = interests[artist.artistId] ?? 'none';
    if (localInterest !== 'must_see') { return map; }

    const artistEvents = getArtistEvents(selectedSlug, artist.artistId);
    const allArtists   = getArtists(selectedSlug);
    for (const event of artistEvents) {
      const overlapping: DbEvent[] = [];
      for (const other of allArtists) {
        if (other.artistId === artist.artistId) { continue; }
        const otherStatus = interests[other.artistId] ?? 'none';
        if (otherStatus !== 'must_see') { continue; }
        const otherEvents = getArtistEvents(selectedSlug, other.artistId);
        for (const otherEvent of otherEvents) {
          if (eventsOverlap(event, otherEvent)) {
            overlapping.push(otherEvent);
          }
        }
      }
      if (overlapping.length > 0) {
        map.set(event.eventId, overlapping);
      }
    }
    return map;
  }, [selectedSlug, artist, interests]);

  function handleStarPress(): void {
    const { next, promise } = cycleStatus(artist.artistId);
    const tracker = startProgress(getFeedbackLabel(next));
    // Check for conflicts with other already-marked artists (uses pre-cycleStatus interests).
    const showConflictWarning = (next === 'must_see') && (() => {
      // CLAUDE: looks like a code duplication, have a helper to collect conflicting events for an artist
      const artistEvents = getArtistEvents(selectedSlug, artist.artistId);
      return getArtists(selectedSlug).some((other) => {
        if (other.artistId === artist.artistId) { return false; }
        const otherStatus = interests[other.artistId] ?? 'none';
        if (otherStatus === 'none') { return false; }
        const otherEvents = getArtistEvents(selectedSlug, other.artistId);
        return otherEvents.some((otherEvent) =>
          artistEvents.some((event) => eventsOverlap(event, otherEvent))
        );
      });
    })();
    promise
      .then(() => {
        if (showConflictWarning) {
          showFeedback('Conflicts with other performances', 'warning');
        } else {
          tracker.confirm();
        }
      })
      .catch((err: unknown) => tracker.warn(err));
  }

  return { closeDetail, status, content, innerWidth, hPad, isWeb, meta, artistNameForURL, artistWebDomain, handleStarPress, width, conflictMap, openConflict };
}

