import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { useConflictDetail } from '../../context/ConflictDetailContext';
import { useConflicts } from '../../context/ConflictContext';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { useBottomSheetMount } from '../../hooks/useBottomSheetMount';
import { conflictGroupOf } from '../../utils/conflictUtils';
import { ConflictTimeline } from '../timeline/ConflictTimeline';
import { formatDayLabel, formatTime } from '../timeline/timelineLayout';
import { planStrings } from '../plan/planStrings';
import { colors, MAX_CONTENT_WIDTH } from '../../styling/tokens';
import type { DbArtist, DbEvent } from '../../types/backend';

// ── Conflict detail ───────────────────────────────────────────────────────────
//
// One clash group on a timeline of its own (ConflictTimeline): every set the
// group chains together, from both timelines, and nothing else. Opened with any
// set of the group; the group itself comes from the live conflicts, so it is the
// one My plan titles.

const SNAP_POINTS = ['100%'];
const strings = planStrings();

// ── Backdrop ──────────────────────────────────────────────────────────────────

function Backdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.6}
    />
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function ConflictDetailHeader({ group, onClose }: { group: DbEvent[]; onClose: () => void }) {
  const from = Math.min(...group.map((e) => e.dateFrom));
  const to = Math.max(...group.map((e) => e.dateTo));
  return (
    <View style={{
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="warning-outline" size={20} color={colors.danger} />
            <Text style={{ fontSize: 20, fontWeight: '700', fontFamily: 'Bold-Default', color: colors.textPrimary }}>
              {strings.conflict}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
            {formatDayLabel(from)}  ·  {formatTime(from)}–{formatTime(to)}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close conflict">
          <Text style={{ fontSize: 20, color: colors.textSecondary, lineHeight: 28 }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────

export function ConflictDetailSheet() {
  const { conflictState, closeConflict } = useConflictDetail();
  const { openDetail } = useArtistDetail();
  const { entries } = useConflicts();
  const { top } = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  // Live, so a sync or a pick changed elsewhere reshapes the group shown.
  const sourceEvent = conflictState.event;
  const group = useMemo(
    () => (sourceEvent === null ? [] : conflictGroupOf(entries, sourceEvent.eventId)),
    [entries, sourceEvent],
  );

  const { mountIndex, onClosed } = useBottomSheetMount(
    sourceEvent !== null,
    0,
    sheetRef,
  );

  // Opening and closing belong to useBottomSheetMount; this only re-expands the
  // sheet when a different conflict is opened while it is already on screen.
  useEffect(() => {
    if (mountIndex === null || sourceEvent === null) { return; }
    sheetRef.current?.expand();
  }, [sourceEvent, mountIndex]);

  const handleClose = useCallback((): void => {
    closeConflict();
  }, [closeConflict]);

  // The sheet's own `onClose`, which fires once its slide-down has finished — only
  // then may the sheet leave the tree.
  const handleSheetClosed = useCallback((): void => {
    onClosed();
    closeConflict();
  }, [onClosed, closeConflict]);

  const handleBlockPress = useCallback((_event: DbEvent, artist: DbArtist): void => {
    openDetail(artist, 'expanded');
    // Defer conflict close to let the artist sheet start its open animation
    // before the conflict sheet's backdrop begins fading out.
    setTimeout(() => closeConflict(), 50);
  }, [closeConflict, openDetail]);

  const translateY      = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [webVisible, setWebVisible] = useState(false);

  // Close on Esc lives in navigation/BackHistoryTracker: one listener owns the
  // dismissal order, so this sheet no longer needs a capture-phase listener and
  // stopPropagation to out-rank the artist sheet's.

  useEffect(() => {
    if (Platform.OS !== 'web') { return; }
    if (sourceEvent !== null) {
      setWebVisible(true);
      Animated.parallel([
        Animated.spring(translateY,      { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 14 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY,      { toValue: 600, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start(() => setWebVisible(false));
    }
  }, [sourceEvent, translateY, backdropOpacity]);

  if (Platform.OS === 'web') {
    if (!webVisible) { return null; }
    return (
      <View style={{ position: 'absolute', inset: 0, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <TouchableOpacity activeOpacity={1} onPress={handleClose} style={{ position: 'absolute', inset: 0 }}>
          <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', opacity: backdropOpacity }} />
        </TouchableOpacity>
        <Animated.View style={{
          maxWidth: MAX_CONTENT_WIDTH,
          width: '100%',
          alignSelf: 'center',
          maxHeight: '100%',
          backgroundColor: colors.surface,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          overflow: 'hidden',
          transform: [{ translateY }],
        }}>
          {group.length > 0 && (
            <>
              <ConflictDetailHeader group={group} onClose={handleClose} />
              <ScrollView>
                <View style={{ paddingVertical: 16 }}>
                  <ConflictTimeline events={group} onBlockPress={handleBlockPress} />
                </View>
              </ScrollView>
            </>
          )}
        </Animated.View>
      </View>
    );
  }

  // Nothing to show — and a mounted-but-closed sheet is exactly what resurfaces
  // as an empty panel after a rotation. See useBottomSheetMount.
  if (mountIndex === null) { return null; }

  return (
    <BottomSheet
      ref={sheetRef}
      index={mountIndex}
      snapPoints={SNAP_POINTS}
      enableDynamicSizing={false}
      topInset={top}
      animationConfigs={{ reduceMotion: ReduceMotion.Never }}
      enablePanDownToClose
      onClose={handleSheetClosed}
      // The library makes the whole sheet one accessibility element by default,
      // which hides everything in it from VoiceOver: the star, the links, the text.
      accessible={false}
      backdropComponent={Backdrop}
      handleIndicatorStyle={{
        backgroundColor: colors.borderMid,
        width: 36,
        height: 4,
        borderRadius: 2,
      }}
      handleStyle={{
        backgroundColor: colors.surface,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
      }}
      backgroundStyle={{ backgroundColor: colors.surface }}
      style={{ maxWidth: MAX_CONTENT_WIDTH, width: '100%', alignSelf: 'center' }}
    >
      {group.length > 0 && <ConflictDetailHeader group={group} onClose={handleClose} />}
      <BottomSheetScrollView>
        {group.length > 0 && (
          <View style={{ paddingVertical: 16 }}>
            <ConflictTimeline events={group} onBlockPress={handleBlockPress} />
          </View>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
