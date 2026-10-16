import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Text } from '../ui/Text';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { usePlanStore } from '../../context/PlanContext';
import { useMinuteNow } from '../../hooks/useMinuteNow';
import { navigationRef } from '../../navigation/navigationRef';
import { nowPillState, type NowPillState } from '../../utils/nowPillState';
import { formatRemaining, planStrings } from './planStrings';
import { BOLD, STATUS_LABEL, TABULAR } from './planStyles';
import { colors } from '../../styling/tokens';

// ── Now pill: the TopBar centre ───────────────────────────────────────────────
//
// One line saying what is on for you right now, on every screen with a TopBar
// (not in the short layout, where the TopBar is hidden). It stands in for the
// logo while it has something to say. Never cycles or animates: motion at the
// top of every screen distracts, and a mid-glance switch is unreadable.

/** Logo is 601 × 231 px; keep its aspect ratio while fitting inside the 56 px bar. */
const LOGO_HEIGHT = 34;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (601 / 231));

const PILL_HEIGHT = 36;
// The pill is drawn 36 pt tall; the tap area grows to 44 pt.
const PILL_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };

const strings = planStrings();

const PILL_STYLE = {
  width: '80%' as const,
  height: PILL_HEIGHT,
  borderRadius: PILL_HEIGHT / 2,
  borderWidth: 1,
  borderColor: colors.borderMid,
  backgroundColor: colors.surfaceRaised,
  paddingHorizontal: 14,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  overflow: 'hidden' as const,
};

function Logo() {
  return (
    <ExpoImage
      source={require('../../../assets/logo-ba.png')}
      style={{ width: LOGO_WIDTH, height: LOGO_HEIGHT }}
      contentFit="contain"
      accessibilityLabel="Brutal Assault"
    />
  );
}

type ViewProps = { state: NowPillState; onPress: () => void };

export function NowPillView({ state, onPress }: ViewProps) {
  if (state.kind === 'logo') {
    return <Logo />;
  }

  if (state.kind === 'live') {
    const time = formatRemaining(state.remainingMs);
    return (
      <Pressable
        testID="now-pill"
        onPress={onPress}
        hitSlop={PILL_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={`${state.artistName} ${strings.live} ${time}`}
        style={[PILL_STYLE, { justifyContent: 'space-between', gap: 14 }]}
      >
        <Text numberOfLines={1} style={[BOLD, { flexShrink: 1, fontSize: 15, color: colors.textPrimary }]}>
          {state.artistName}
        </Text>
        {/* Tight inside the status group, wider from the name: two units, who and their state. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger }} />
              <Text style={STATUS_LABEL}>{strings.live}</Text>
            </View>
            <Text style={[BOLD, TABULAR, { fontSize: 15, color: colors.accent }]}>{time}</Text>
          </View>
          {state.more > 0 && (
            <View style={{ borderWidth: 1, borderColor: colors.danger, borderRadius: 8, paddingHorizontal: 5 }}>
              <Text style={[BOLD, { fontSize: 12, lineHeight: 16, color: colors.danger }]}>{`+${state.more}`}</Text>
            </View>
          )}
        </View>
        <View
          testID="now-pill-progress"
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: colors.liveTrack }}
        >
          <View style={{ height: 3, width: `${Math.round(state.progress * 100)}%`, backgroundColor: colors.accent }} />
        </View>
      </Pressable>
    );
  }

  const time = formatRemaining(state.remainingMs);
  return (
    <Pressable
      testID="now-pill"
      onPress={onPress}
      hitSlop={PILL_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${time} ${strings.till} ${state.artistName}`}
      style={[PILL_STYLE, { justifyContent: 'center', gap: 6 }]}
    >
      <Text style={[BOLD, TABULAR, { fontSize: 15, color: colors.breakBlue }]}>{time}</Text>
      <Text style={{ fontSize: 13, color: colors.textPrimary }}>{strings.till}</Text>
      <Text numberOfLines={1} style={[BOLD, { flexShrink: 1, fontSize: 15, color: colors.textPrimary }]}>
        {state.artistName}
      </Text>
    </Pressable>
  );
}

/** Opens My plan on today, scrolled to now. */
function useOpenPlanAtNow(): () => void {
  const store = usePlanStore();
  return useCallback((): void => {
    store.requestNow();
    if (navigationRef.isReady()) {
      navigationRef.navigate('MyPlan');
    }
  }, [store]);
}

export function NowPill() {
  const slug = useSelectedSlug();
  const { interests } = useInterest();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();
  const openPlanAtNow = useOpenPlanAtNow();

  const state = useMemo(
    () => nowPillState(interests, { artists, stages, artistEvents }, festivalDays, now),
    [interests, artists, stages, artistEvents, festivalDays, now],
  );

  return <NowPillView state={state} onPress={openPlanAtNow} />;
}
