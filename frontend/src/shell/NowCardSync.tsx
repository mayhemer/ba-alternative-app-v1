import React, { memo, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useSelectedSlug } from '../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../store/cacheStore';
import { useDeferredInterests } from '../features/interests/InterestContext';
import { nowCardScript, sameNowCardScript, shouldAskNowCardPermission, type NowCardSegment } from '../lib/nowCard';
import { useStableValue } from '../hooks/useStableValue';
import { planStrings } from '../screens/my-plan/planStrings';
import { NOW_CARD_URL } from '../navigation/nowCardLink';
import { currentTimeMs } from '../utils/clock';
import {
  getNowCardPermission,
  nowCardAvailable,
  requestNowCardPermission,
  setNowCardScript,
  type NowCardPayload,
} from '../../modules/now-card';

// ── Keeping the lock-screen now card in step ──────────────────────────────────
//
// Renders nothing. Computes the card's script for the whole festival
// (lib/nowCard.ts) from the deferred picks, as the now pill reads them, and
// hands it to the native side (modules/now-card) whenever it changes and
// whenever the app comes to the front: on iOS that hand-over is the card's
// refresh (start, update, restart before its 8 h limit), on Android it
// reschedules the alarms.
//
// A component of its own, so a star press re-renders it and not AppShell.
//
// On Android it also asks for the notification permission, once, on the first
// app open of a festival day that still has a Must-see to show.

const strings = planStrings();

function payload(script: NowCardSegment[]): NowCardPayload {
  return {
    version: 1,
    segments: script,
    strings: { live: strings.live, next: strings.cardNext, over: strings.cardOver, channel: strings.cardChannel },
    url: NOW_CARD_URL,
  };
}

type ViewProps = { script: NowCardSegment[]; festivalDays: number[] };

/** The hand-over itself, from a script already computed. */
export const NowCardSyncView = memo(function NowCardSyncView({ script, festivalDays }: ViewProps): null {
  const scriptRef = useRef(script);
  scriptRef.current = script;

  useEffect(() => {
    if (!nowCardAvailable) {
      return;
    }
    void setNowCardScript(payload(script));
  }, [script]);

  useEffect(() => {
    if (!nowCardAvailable) {
      return undefined;
    }
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void setNowCardScript(payload(scriptRef.current));
      }
    });
    return () => { sub.remove(); };
  }, []);

  useEffect(() => {
    if (!nowCardAvailable || Platform.OS !== 'android') {
      return;
    }
    let cancelled = false;
    void (async () => {
      const permission = await getNowCardPermission();
      if (cancelled) {
        return;
      }
      if (shouldAskNowCardPermission(script, festivalDays, currentTimeMs(), permission !== 'undetermined')) {
        await requestNowCardPermission();
        if (!cancelled) {
          void setNowCardScript(payload(scriptRef.current));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [script, festivalDays]);

  return null;
});

export function NowCardSync(): React.JSX.Element | null {
  const slug = useSelectedSlug();
  const interests = useDeferredInterests();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const festivalDays = useFestivalDays(slug);

  const computed = useMemo(
    () => nowCardScript(interests, { artists, stages, artistEvents }, festivalDays),
    [interests, artists, stages, artistEvents, festivalDays],
  );
  // The card's content changes far less often than the picks do.
  const script = useStableValue(computed, sameNowCardScript);

  if (!nowCardAvailable) {
    return null;
  }
  return <NowCardSyncView script={script} festivalDays={festivalDays} />;
}
