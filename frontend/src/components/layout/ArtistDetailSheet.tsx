import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { ArtistDetailHeader, ArtistDetailBody } from '../../screens/ArtistDetailScreen';
import { useBottomSheetMount } from '../../hooks/useBottomSheetMount';
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
  // The array must keep a *constant length* across rotations. Indexes are used
  // imperatively below, and BottomSheet does not adopt a new snapPoints prop
  // until after this render commits — so an index that is only valid for the new
  // array throws "'index' was provided but out of the provided snap points
  // range". Two stops always exist; only their sizes change. enableDynamicSizing
  // is off for the same reason: it would splice a content-sized stop into the
  // array, shifting index 1 off '100%' whenever an artist's body is short.
  const snapPoints = useMemo<(string | number)[]>(() => {
    const collapsed = Math.min(
      Math.max(COLLAPSED_MIN_HEIGHT, Math.round(height * 0.4)),
      Math.round(height * COLLAPSED_MAX_FRACTION),
    );
    return [collapsed, '100%'];
  }, [height]);

  const openIndex = detailState.presentation === 'collapsed' ? 0 : 1;
  const { mountIndex, onClosed } = useBottomSheetMount(
    detailState.artist !== null,
    openIndex,
    sheetRef,
  );

  // Opening and closing belong to useBottomSheetMount; this only follows
  // presentation changes made while the sheet is already on screen — the
  // conflict marker in the collapsed header expands it in place.
  //
  // Deliberately not keyed on the snap points: they are re-measured on rotation,
  // and BottomSheet re-snaps itself when they change.
  useEffect(() => {
    if (mountIndex === null || detailState.artist === null) { return; }
    sheetRef.current?.snapToIndex(openIndex);
  }, [detailState, mountIndex, openIndex]);

  const handleClose = useCallback(() => {
    onClosed();
    closeDetail();
  }, [onClosed, closeDetail]);

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

  // Nothing to show — and a mounted-but-closed sheet is exactly what resurfaces
  // as an empty panel after a rotation. See useBottomSheetMount.
  if (mountIndex === null) { return null; }

  return (
    <BottomSheet
      ref={sheetRef}
      index={mountIndex}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
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
