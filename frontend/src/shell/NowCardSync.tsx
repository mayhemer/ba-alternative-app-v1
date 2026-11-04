import React, { memo, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useSelectedSlug } from '../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../store/cacheStore';
import { useDeferredInterests } from '../features/interests/InterestContext';
import { nowCardScript, sameNowCardScript, shouldAskNowCardPermission, type NowCardSegment, type NowCardSet } from '../lib/nowCard';
import { useStableValue } from '../hooks/useStableValue';
import { planStrings } from '../screens/my-plan/planStrings';
import { NOW_CARD_URL } from '../navigation/nowCardLink';
import { currentTimeMs, realTimeMs } from '../utils/clock'; // LIVE SIMULATION: realTimeMs
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

// LIVE SIMULATION (testing branch): the phone switches the card and draws its
// countdowns on the real clock, so the script's simulated times move into the
// real week. The shift is one constant for the week; the time texts
// ("19:00–20:00") stay the festival's, as the simulation keeps wall-clock times.
function onRealClock(script: NowCardSegment[]): NowCardSegment[] {
  const shift = realTimeMs() - currentTimeMs();
  if (shift === 0) {
    return script;
  }
  const moved = (s: NowCardSet): NowCardSet => ({ ...s, start: s.start + shift, end: s.end + shift });
  return script.map((seg): NowCardSegment => {
    const from = seg.from + shift;
    const to = seg.to + shift;
    if (seg.state.kind === 'break') {
      return { from, to, state: { kind: 'break', next: moved(seg.state.next) } };
    }
    const next = seg.state.next !== null ? moved(seg.state.next) : null;
    return { from, to, state: { ...seg.state, live: moved(seg.state.live), next } };
  });
}

function payload(script: NowCardSegment[]): NowCardPayload {
  return {
    version: 2,
    segments: onRealClock(script), // LIVE SIMULATION (testing branch)
    strings: { live: strings.live, next: strings.cardNext, nextShort: strings.cardNextShort, over: strings.cardOver, channel: strings.cardChannel },
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
