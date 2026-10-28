import React, { memo, useCallback, useMemo, useState } from 'react';
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
import { useJumpToTimeline } from '../../navigation/useJumpToTimeline';
import { nowPillModel, nowPillTap, nowPillTarget, type NowPillModel, type NowPillTarget } from './NowPill.model';
import { BOLD, PROGRESS_COLORS, TABULAR } from './planStyles';
import { colors } from '../../styling/tokens';

// ── Now pill: the TopBar centre ───────────────────────────────────────────────
//
// One line in a capsule saying what is on for you right now, on every screen
// with a TopBar (not in the short layout, where the TopBar is hidden). It stands
// in for the logo while it has something to say. No words, so nothing to
// translate: a red dot marks a live set, an arrow the next one. Never cycles or
// animates: motion at the top of every screen distracts, and a mid-glance
// switch is unreadable.

/** Logo is 601 × 231 px; keep its aspect ratio while fitting inside the 56 px bar. */
const LOGO_HEIGHT = 34;
const LOGO_WIDTH = Math.round(LOGO_HEIGHT * (601 / 231));
const LOGO_STYLE = { width: LOGO_WIDTH, height: LOGO_HEIGHT };

const PILL_HEIGHT = 36;
// The pill is drawn 36 pt tall; the tap area grows to 44 pt.
const PILL_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };
/** In from each side slot: 26 pt clear of the 38 pt chips (TopBarChip) in the 56 pt right slot. */
const PILL_INSET = 8;
/** 10 % under the plan rows' 14 pt, to fit more of the (all-caps) band name. */
const PILL_FONT_SIZE = 12.6;
const PROGRESS_HEIGHT = 3;

const PILL_STYLE = {
  alignSelf: 'stretch' as const,
  marginHorizontal: PILL_INSET,
  height: PILL_HEIGHT,
  borderRadius: PILL_HEIGHT / 2,
  borderWidth: 1,
  borderColor: colors.borderMid,
  backgroundColor: colors.surfaceRaised,
  paddingHorizontal: 12,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: 7,
  overflow: 'hidden' as const,
};
const LIVE_PILL_STYLE = { ...PILL_STYLE, justifyContent: 'flex-start' as const };
const BREAK_PILL_STYLE = { ...PILL_STYLE, justifyContent: 'center' as const };
/** While a finger is down: the surface steps up, as a button's does. */
const PRESSED_STYLE = { backgroundColor: colors.surfacePressed };

const DOT_STYLE = { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger };
const NAME_STYLE = { ...BOLD, flexShrink: 1, fontSize: PILL_FONT_SIZE, color: colors.textPrimary };
// The live time sits at the right end; the clash glyph, if any, after it.
const LIVE_TIME_STYLE = { ...BOLD, ...TABULAR, marginLeft: 'auto' as const, paddingLeft: 4, fontSize: PILL_FONT_SIZE, color: colors.accent };
const BREAK_TIME_STYLE = { ...BOLD, ...TABULAR, fontSize: PILL_FONT_SIZE, color: colors.breakBlue };
const PROGRESS_TRACK_STYLE = { position: 'absolute' as const, left: 0, right: 0, bottom: 0, height: PROGRESS_HEIGHT, backgroundColor: PROGRESS_COLORS.live.remaining };

function Logo() {
  return (
    <ExpoImage
      source={require('../../../assets/logo-ba.png')}
      style={LOGO_STYLE}
      contentFit="contain"
      accessibilityLabel="Brutal Assault"
    />
  );
}

type ViewProps = { state: NowPillModel; onPress: () => void };

function NowPillViewBase({ state, onPress }: ViewProps) {
  const [pressed, setPressed] = useState(false);
  const pressIn = useCallback((): void => { setPressed(true); }, []);
  const pressOut = useCallback((): void => { setPressed(false); }, []);

  if (state.kind === 'logo') {
    return <Logo />;
  }

  if (state.kind === 'live') {
    return (
      <Pressable
        testID="now-pill"
        onPress={onPress}
        hitSlop={PILL_HIT_SLOP}
        accessibilityRole="button"
        onPressIn={pressIn}
        onPressOut={pressOut}
        accessibilityLabel={state.accessibilityLabel}
        style={[LIVE_PILL_STYLE, pressed && PRESSED_STYLE]}
      >
        <View style={DOT_STYLE} />
        <Text numberOfLines={1} style={NAME_STYLE}>{state.artistName}</Text>
        <Text style={LIVE_TIME_STYLE}>{state.time}</Text>
        {state.more > 0 && (
          <View testID="now-pill-clash">
            <Ionicons name="warning-outline" size={13} color={colors.danger} />
          </View>
        )}
        <View testID="now-pill-progress" pointerEvents="none" style={PROGRESS_TRACK_STYLE}>
          <View testID="now-pill-fill" style={{ height: PROGRESS_HEIGHT, width: `${Math.round(state.progress * 100)}%`, backgroundColor: PROGRESS_COLORS.live.passed }} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      testID="now-pill"
      onPress={onPress}
      hitSlop={PILL_HIT_SLOP}
      accessibilityRole="button"
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityLabel={state.accessibilityLabel}
      style={[BREAK_PILL_STYLE, pressed && PRESSED_STYLE]}
    >
      <Text style={BREAK_TIME_STYLE}>{state.time}</Text>
      <Ionicons name="chevron-forward" size={11} color={colors.textMuted} />
      <Text numberOfLines={1} style={NAME_STYLE}>{state.artistName}</Text>
    </Pressable>
  );
}

/**
 * Draws again only when its model or handler changes. Outside the festival and
 * between days the model is the same logo every minute, so the tick stops here.
 */
export const NowPillView = memo(NowPillViewBase);

/**
 * What a tap does (nowPillTap): on My plan, shows the pill's set on its
 * timeline; elsewhere, opens My plan on today, scrolled to now. The screen is
 * read at tap time, so changing screens does not re-render the pill.
 */
function useNowPillPress(target: NowPillTarget | null): () => void {
  const store = usePlanStore();
  const jumpToTimeline = useJumpToTimeline();
  return useCallback((): void => {
    if (!navigationRef.isReady()) {
      return;
    }
    const tap = nowPillTap(navigationRef.getCurrentRoute()?.name, target);
    switch (tap.kind) {
      case 'timeline':
        jumpToTimeline(tap.target.event, tap.target.jump);
        break;
      case 'plan':
        store.requestNow();
        navigationRef.navigate('MyPlan');
        break;
      case 'none':
        break;
    }
  }, [target, store, jumpToTimeline]);
}

export function NowPill() {
  const slug = useSelectedSlug();
  const { interests } = useInterest();
  const artists = useArtists(slug);
  const stages = useStages(slug);
  const artistEvents = useArtistEventMap(slug);
  const festivalDays = useFestivalDays(slug);
  const now = useMinuteNow();

  const state = useMemo(
    () => nowPillModel(interests, { artists, stages, artistEvents }, festivalDays, now),
    [interests, artists, stages, artistEvents, festivalDays, now],
  );

  const target = useMemo(
    () => nowPillTarget(interests, { artists, stages, artistEvents }, festivalDays, now),
    [interests, artists, stages, artistEvents, festivalDays, now],
  );
  const onPress = useNowPillPress(target);

  return <NowPillView state={state} onPress={onPress} />;
}
