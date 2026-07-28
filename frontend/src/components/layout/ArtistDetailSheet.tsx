import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { ArtistDetailHeader, ArtistDetailBody } from '../../screens/ArtistDetailScreen';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import { colors } from '../../styling/tokens';

// Enough for the title row, the star and the friend picks — below this the
// collapsed presentation shows nothing useful.
const COLLAPSED_MIN_HEIGHT = 260;
// …but never so tall that it is indistinguishable from the expanded stop.
const COLLAPSED_MAX_FRACTION = 0.75;

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

export function ArtistDetailSheet() {
  const { detailState, closeDetail } = useArtistDetail();
  const { top } = useSafeAreaInsets();
  const { height } = useLayoutMode();
  const sheetRef = useRef<BottomSheet>(null);

  // '40%' of a landscape phone is ~150 px — barely the title row — so the
  // collapsed stop is sized in points, with a floor and a ceiling.
  //
  // The array must keep a *constant length* across rotations. snapToIndex is
  // called imperatively below, and BottomSheet does not adopt a new snapPoints
  // prop until after this render commits — so an index that is only valid for
  // the new array throws "'index' was provided but out of the provided snap
  // points range". Two stops always exist; only their sizes change.
  const snapPoints = useMemo<(string | number)[]>(() => {
    const collapsed = Math.min(
      Math.max(COLLAPSED_MIN_HEIGHT, Math.round(height * 0.4)),
      Math.round(height * COLLAPSED_MAX_FRACTION),
    );
    return [collapsed, '100%'];
  }, [height]);

  // Deliberately keyed on detailState alone: this reacts to the sheet being
  // opened, expanded or closed, not to the snap points being re-measured on
  // rotation. BottomSheet re-snaps itself when they change.
  useEffect(() => {
    if (detailState.artist === null) {
      sheetRef.current?.close();
    } else if (detailState.presentation === 'collapsed') {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.snapToIndex(1);
    }
  }, [detailState]);

  const handleClose = useCallback(() => {
    closeDetail();
  }, [closeDetail]);

  if (Platform.OS === 'web') {
    if (detailState.artist === null) { return null; }
    return (
      <View style={{ position: 'absolute', inset: 0, backgroundColor: colors.background }}>
        <ArtistDetailHeader artist={detailState.artist} />
        <ScrollView>
          <ArtistDetailBody artist={detailState.artist} />
        </ScrollView>
      </View>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      topInset={top}
      animationConfigs={{ reduceMotion: ReduceMotion.Never }}
      enablePanDownToClose
      onClose={handleClose}
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
    >
      {detailState.artist !== null && (
        <ArtistDetailHeader artist={detailState.artist} />
      )}
      <BottomSheetScrollView>
        {detailState.artist !== null && (
          <ArtistDetailBody artist={detailState.artist} />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
