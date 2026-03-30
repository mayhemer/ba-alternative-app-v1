import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Linking, Platform, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { Text } from '../components/ui/Text';
import { StarButton, getFeedbackLabel } from '../components/StarButton';
import { useArtistDetail } from '../context/ArtistDetailContext';
import { useInterest } from '../context/InterestContext';
import { getCategoryLocalized } from '../utils/localization';
import { formatTime } from '../components/timeline/timelineLayout';
import { useStartProgress } from '../context/ScreenUIContext';
import { getArtistLocalized } from '../utils/localization';
import { colors } from '../styling/tokens';
import type { DbArtist } from '../types/backend';

const MAX_CONTENT_WIDTH = 700;
const PADDING_BREAKPOINT = 732;

type Props = { artist: DbArtist };

// ── Content (no scroll wrapper — caller provides BottomSheetScrollView) ──────

export function ArtistDetailContent({ artist }: Props) {
  const { closeDetail, detailState } = useArtistDetail();
  const { detailEvent } = detailState;
  const { getStatus, cycleStatus } = useInterest();
  const startProgress = useStartProgress();
  const { width } = useWindowDimensions();

  const status  = getStatus(artist.artistId);
  const genre   = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  const content = getArtistLocalized(artist.localized, 'content');

  const innerWidth  = Math.min(width, MAX_CONTENT_WIDTH);
  const imageHeight = Math.round(innerWidth * (3 / 4));
  const hPad        = width >= PADDING_BREAKPOINT ? 0 : 16;
  const htmlWidth   = innerWidth - hPad * 2;
  const isWeb = Platform.OS === 'web';
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => { setImageLoading(true); }, [artist.artistId]);

  useEffect(() => {
    if (!isWeb) { return; }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') { closeDetail(); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWeb, closeDetail]);

  function handleStarPress(): void {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }

  const meta = [genre, country].filter(Boolean).join('  ·  ');

  const htmlTagsStyles = {
    body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
    p:    { marginBottom: 12 },
    a:    { color: colors.accent },
  };

  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width: innerWidth }}>

        {/* ── Header ── */}
        <View style={{ paddingHorizontal: hPad, paddingTop: 12, paddingBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Text
              numberOfLines={2}
              style={{ flex: 1, fontSize: 24, fontWeight: '700', color: colors.textPrimary, fontFamily: 'Bold-Default', marginRight: 8 }}
            >
              {artist.name}
            </Text>
            <StarButton status={status} onPress={handleStarPress} size="large" />
            {isWeb && (
              <TouchableOpacity onPress={closeDetail} hitSlop={8} style={{ marginLeft: 12 }}>
                <Text style={{ fontSize: 20, color: colors.textSecondary, lineHeight: 28 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {meta !== '' && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
              {meta}
            </Text>
          )}
        </View>

        {/* ── Hero image ── */}
        <View style={{ width: innerWidth, height: imageHeight }}>
          <Image
            source={{ uri: artist.thumbUrl }}
            style={{ width: innerWidth, height: imageHeight }}
            resizeMode="cover"
            onLoad={() => setImageLoading(false)}
            onError={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={{ position: 'absolute', top: 32, left: 0, right: 0, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
        </View>

        {/* ── Event info (time + category, when opened from timeline) ── */}
        {detailEvent !== null && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16, color: colors.textPrimary }}>
              {formatTime(detailEvent.event.dateFrom)}–{formatTime(detailEvent.event.dateTo)}
            </Text>
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>·</Text>
            <Text style={{ fontSize: 16, color: colors.textPrimary }}>
              {getCategoryLocalized(detailEvent.category.localized, 'title')}
            </Text>
          </View>
        )}

        {content !== '' && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 32 }}>
            {/* ── Artist URL ── */}
            {artist.url !== '' && (
              <TouchableOpacity
              onPress={() => Linking.openURL(artist.url)}
              style={{ paddingVertical: 12 }}
              >
                <Text style={{ fontSize: 16, color: colors.textSecondary }}>Official Website ↗</Text>
              </TouchableOpacity>
            )}

            {/* ── HTML content ── */}
            <RenderHtml    
              contentWidth={htmlWidth}
              source={{ html: content }}
              tagsStyles={htmlTagsStyles}
            />
          </View>
        )}

      </View>
    </View>
  );
}
