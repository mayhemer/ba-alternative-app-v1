import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import type { BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtistDetail } from '../../context/ArtistDetailContext';
import { ArtistDetailContent } from '../../screens/ArtistDetailScreen';
import { colors } from '../../styling/tokens';

const SNAP_POINTS = ['30%', '100%'];

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
  const sheetRef = useRef<BottomSheet>(null);

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
        <ScrollView>
          <ArtistDetailContent artist={detailState.artist} />
        </ScrollView>
      </View>
    );
  }

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={SNAP_POINTS}
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
      <BottomSheetScrollView>
        {detailState.artist !== null && (
          <ArtistDetailContent artist={detailState.artist} />
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
