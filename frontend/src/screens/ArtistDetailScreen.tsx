import React from 'react';
import { Image, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import RenderHtml from 'react-native-render-html';
import { Text } from '../components/ui/Text';
import { StarButton, getFeedbackLabel } from '../components/StarButton';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useInterest } from '../context/InterestContext';
import { useStartProgress } from '../context/ScreenUIContext';
import { getArtistLocalized } from '../utils/localization';
import { colors } from '../styling/tokens';
import type { DbArtist } from '../types/backend';

type Props = { artist: DbArtist };

// ── Content (no scroll wrapper — caller provides BottomSheetScrollView or ScrollView) ──

export function ArtistDetailContent({ artist }: Props) {
  const { closeDetail } = useArtistDetail();
  const { getStatus, cycleStatus } = useInterest();
  const startProgress = useStartProgress();
  const { width } = useWindowDimensions();

  const status  = getStatus(artist.artistId);
  const genre   = getArtistLocalized(artist.localized, 'genre');
  const content = getArtistLocalized(artist.localized, 'content');

  const imageHeight = Math.round(width * (3 / 4));

  function handleStarPress(): void {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }

  const htmlTagsStyles = {
    body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    p:    { marginBottom: 12 },
    a:    { color: colors.accent },
  };

  return (
    <View>
      {/* ── Hero image ── */}
      <View style={{ width, height: imageHeight }}>
        <Image
          source={{ uri: artist.imageUrl }}
          style={{ width, height: imageHeight }}
          resizeMode="cover"
        />

        <LinearGradient
          colors={['transparent', colors.background]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: imageHeight * 0.45 }}
        />

        {/* Name + genre */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: colors.white, fontFamily: 'Bold-Default' }}>
            {artist.name}
          </Text>
          {genre !== '' && (
            <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 2 }}>
              {genre}
            </Text>
          )}
        </View>

        {/* Star — top right */}
        <View style={{ position: 'absolute', top: 12, right: 12 }}>
          <StarButton status={status} onPress={handleStarPress} size="large" />
        </View>

        {/* Close — top left */}
        <TouchableOpacity
          onPress={closeDetail}
          hitSlop={12}
          style={{ position: 'absolute', top: 12, left: 12 }}
        >
          <Text style={{ fontSize: 22, color: colors.white }}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* ── HTML content ── */}
      {content !== '' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}>
          <RenderHtml
            contentWidth={width - 32}
            source={{ html: content }}
            tagsStyles={htmlTagsStyles}
          />
        </View>
      )}
    </View>
  );
}
