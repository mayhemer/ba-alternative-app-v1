import { useMemo } from 'react';
import { Platform } from 'react-native';
import { getFeedbackLabel } from '../components/StarButton';
import { useArtistDetail as useArtistDetailContext } from '../context/ArtistDetailContext';
import { useInterest } from '../context/InterestContext';
import { useConflictDetail } from '../context/ConflictDetailContext';
import { getArtistLocalized } from '../utils/localization';
import { useStartProgress } from '../context/ScreenUIContext';
import { getArtistEvents, getArtists } from '../cache/cacheService';
import { eventsOverlap } from '../utils/conflictUtils';
import { useSelectedSlug } from '../store/AppContext';
import type { DbArtist, DbEvent } from '../types/backend';
import { MAX_CONTENT_WIDTH } from '../styling/tokens';
import { useLayoutMode } from './useLayoutMode';

// Hero box height as a fraction of its width — 3:2.
const HERO_ASPECT = 0.666;
// …and its ceiling as a fraction of the viewport height.
const HERO_MAX_VIEWPORT_FRACTION = 1;

// ── Shared derived values ─────────────────────────────────────────────────────

export function useArtistDerived(artist: DbArtist) {
  const { closeDetail, expandDetail } = useArtistDetailContext();
  const { interests, getStatus, cycleStatus } = useInterest();
  const { openConflict } = useConflictDetail();
  const selectedSlug = useSelectedSlug();
  const startProgress = useStartProgress();
  const { width, height, contentPadding } = useLayoutMode();

  const status  = getStatus(artist.artistId);
  const genre   = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  const content = getArtistLocalized(artist.localized, 'content');

  const innerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const hPad       = contentPadding;
  const isWeb      = Platform.OS === 'web';
  const meta       = [genre, country].filter(Boolean).join('  ·  ');

  // Hero keeps its 3:2 aspect, capped against the viewport height.
  //
  // The cap is a full viewport rather than half of one, and only ever binds in
  // landscape (in portrait the width-derived height is the smaller of the two).
  // The image is laid out `contentFit: 'contain'` in a box the full content
  // width, so on a wide screen it is the box's *height* that limits it: halving
  // that height did not crop the image, it shrank it and padded the sides with
  // black. Letting the box fill the viewport is what makes the image large,
  // accepting that it no longer fits on screen alongside the rest of the detail.
  const heroHeight = Math.round(Math.min(innerWidth * HERO_ASPECT, height * HERO_MAX_VIEWPORT_FRACTION));

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
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }

  return { closeDetail, expandDetail, status, content, innerWidth, heroHeight, hPad, isWeb, meta, artistNameForURL, artistWebDomain, handleStarPress, width, conflictMap, openConflict };
}

