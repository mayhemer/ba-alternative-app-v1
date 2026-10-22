import React, { useCallback, useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { useSelectedSlug } from '../../store/AppContext';
import { useArtistEventMap, useArtists, useFestivalDays, useStages } from '../../store/cacheStore';
import { useInterest } from '../../context/InterestContext';
import { usePlanStore } from '../../context/PlanContext';
import { useMinuteNow } from '../../hooks/useMinuteNow';
import { navigationRef } from '../../navigation/navigationRef';
import { nowPillModel, type NowPillModel } from './NowPill.model';
import { BOLD, STATUS_LABEL, TABULAR } from './planStyles';
import { colors } from '../../styling/tokens';

// ── Now pill: the TopBar centre ───────────────────────────────────────────────
//
// Two centred lines saying what is on for you right now, on every screen with a
// TopBar (not in the short layout, where the TopBar is hidden): the band, then
// its state and time left. No container: it reads as the bar's title, and it
// stands in for the logo while it has something to say. Never cycles or
// animates: motion at the top of every screen distracts, and a mid-glance
// switch is unreadable.

/** Logo is 601 × 231 px; keep its aspect ratio while fitting inside the 56 px bar. */
const LOGO_HEIGHT = 34;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (601 / 231));

const PROGRESS_HEIGHT = 3;

/** Text dims while pressed: the pill has no surface to highlight. */
const PRESSED_OPACITY = 0.5;

const TITLE_STYLE = { ...BOLD, flexShrink: 1, fontSize: 15, lineHeight: 18, color: colors.textPrimary };
const LABEL_STYLE = { ...STATUS_LABEL, color: colors.textSecondary };
const TIME_STYLE = { ...BOLD, ...TABULAR, fontSize: 13, lineHeight: 16 };

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

type ViewProps = { state: NowPillModel; onPress: () => void };

export function NowPillView({ state, onPress }: ViewProps) {
  if (state.kind === 'logo') {
    return <Logo />;
  }

  const live = state.kind === 'live';
  return (
    <Pressable
      testID="now-pill"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={state.accessibilityLabel}
      style={({ pressed }) => ({
        flex: 1,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        opacity: pressed ? PRESSED_OPACITY : 1,
      })}
    >
      {/* Who: the band, and a chevron saying the bar opens something */}
      <View style={{ maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text numberOfLines={1} style={TITLE_STYLE}>{state.artistName}</Text>
        <Ionicons name="chevron-forward" size={12} color={colors.muted} />
      </View>
      {/* Their state: live and time to the end, or the time to the start */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {live && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger }} />}
        <Text style={LABEL_STYLE}>{state.label}</Text>
        <Text style={[TIME_STYLE, { color: live ? colors.accent : colors.breakBlue }]}>{state.time}</Text>
        {live && state.more > 0 && (
          <View style={{ marginLeft: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Ionicons name="warning-outline" size={14} color={colors.danger} />
            <Text style={[BOLD, { fontSize: 13, lineHeight: 16, color: colors.danger }]}>{`+${state.more}`}</Text>
          </View>
        )}
      </View>
      {live && (
        <View
          testID="now-pill-progress"
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: PROGRESS_HEIGHT, backgroundColor: colors.liveTrack }}
        >
          <View style={{ height: PROGRESS_HEIGHT, width: `${Math.round(state.progress * 100)}%`, backgroundColor: colors.accent }} />
        </View>
      )}
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
    () => nowPillModel(interests, { artists, stages, artistEvents }, festivalDays, now),
    [interests, artists, stages, artistEvents, festivalDays, now],
  );

  return <NowPillView state={state} onPress={openPlanAtNow} />;
}
