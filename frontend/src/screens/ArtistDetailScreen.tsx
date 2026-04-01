import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import RenderHtml from 'react-native-render-html';
import { Text } from '../components/ui/Text';
import { StarButton, getFeedbackLabel } from '../components/StarButton';
import { useArtistDetail as useArtistDetailContext } from '../context/ArtistDetailContext';
import { useInterest } from '../context/InterestContext';
import { getStageLocalized, getArtistLocalized } from '../utils/localization';
import { formatTime, formatDayLabel } from '../components/timeline/timelineLayout';
import { useStartProgress } from '../context/ScreenUIContext';
import { getArtistEvents, getStages, getCategories } from '../cache/cacheService';
import { decodeCategoryColor } from '../utils/color';
import { colors } from '../styling/tokens';
import type { DbArtist } from '../types/backend';

const MAX_CONTENT_WIDTH = 700;
const PADDING_BREAKPOINT = 732;
const STREAMING_ICON_SIZE = 24;

const HTML_TAG_STYLES = {
  body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  p:    { marginBottom: 12 },
  a:    { color: colors.accent },
};

type Props = { artist: DbArtist };

// ── Shared derived values ─────────────────────────────────────────────────────

function useArtistDerived(artist: DbArtist) {
  const { closeDetail } = useArtistDetailContext();
  const { getStatus, cycleStatus } = useInterest();
  const startProgress = useStartProgress();
  const { width } = useWindowDimensions();

  const status  = getStatus(artist.artistId);
  const genre   = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  const content = getArtistLocalized(artist.localized, 'content');

  const innerWidth = Math.min(width, MAX_CONTENT_WIDTH);
  const hPad       = width >= PADDING_BREAKPOINT ? 0 : 16;
  const isWeb      = Platform.OS === 'web';
  const meta       = [genre, country].filter(Boolean).join('  ·  ');

  const artistNameForURL = encodeURIComponent(artist.name.toLocaleLowerCase());
  let artistWebDomain = '';
  try {
    if (artist.url !== '') { artistWebDomain = new URL(artist.url).hostname.replace(/^www\./, ''); }
  } catch (_) { /* invalid URL */ }

  function handleStarPress(): void {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }

  return { closeDetail, status, content, innerWidth, hPad, isWeb, meta, artistNameForURL, artistWebDomain, handleStarPress, width };
}

// ── Header (sticky — rendered outside scroll view) ────────────────────────────

export function ArtistDetailHeader({ artist }: Props) {
  const { closeDetail, status, innerWidth, hPad, isWeb, meta, handleStarPress } = useArtistDerived(artist);

  return (
    <View style={{
      alignSelf: 'center',
      width: innerWidth,
      paddingHorizontal: hPad,
      paddingTop: 12,
      paddingBottom: 8,
      backgroundColor: colors.surface,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text
          numberOfLines={3}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            color: colors.textPrimary,
            flex: 1,
            fontSize: 24,
            fontWeight: '700',
            fontFamily: 'Bold-Default',
            marginRight: 8,
          }}
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
  );
}

// ── Body (scrollable content) ─────────────────────────────────────────────────

export function ArtistDetailBody({ artist }: Props) {
  const { closeDetail, content, innerWidth, hPad, isWeb, artistNameForURL, artistWebDomain, width } = useArtistDerived(artist);

  const imageHeight = Math.round(innerWidth * 0.666);
  const htmlWidth   = innerWidth - hPad * 2;
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

  const artistEvents = getArtistEvents(artist.slug, artist.artistId);
  const stagesForSlug = getStages(artist.slug);
  const stageById = Object.fromEntries(stagesForSlug.map((s) => [s.stageId, s]));
  const categoriesForSlug = getCategories(artist.slug);
  const categoryById = Object.fromEntries(categoriesForSlug.map((c) => [c.categoryId, c]));

  const htmlSource = useMemo(() => ({ html: content }), [content]);

  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width: innerWidth }}>

        {/* External links to the band */}
        {(artist.isPlayable || artist.url !== '') && (
          <View style={{
            paddingHorizontal: hPad,
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 18,
          }}>
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://open.spotify.com/search/${artistNameForURL}`)}>
                <ExpoImage
                  source={require('../../assets/spotify-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )}
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://tidal.com/search?q=${artistNameForURL}`)}>
                <ExpoImage
                  source={require('../../assets/tidal-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )}
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.metal-archives.com/search?searchString=${artistNameForURL}&type=band_name`)}>
                <ExpoImage
                  source={require('../../assets/metal-archives-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            )}
            {artistWebDomain !== '' && (
              <TouchableOpacity onPress={() => Linking.openURL(artist.url)}>
                <Text style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  borderWidth: 1,
                  borderColor: colors.muted,
                  borderRadius: STREAMING_ICON_SIZE / 2,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  textAlign: 'center',
                }}>
                  {artistWebDomain} ↗
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Hero image ── */}
        <View style={{
          width: innerWidth,
          height: imageHeight,
          marginVertical: 16,
          backgroundColor: colors.black,
        }}>
          <ExpoImage
            source={{ uri: artist.thumbUrl }}
            style={{ width: innerWidth, height: imageHeight }}
            contentFit="contain"
            cachePolicy="memory"
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={{ position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
        </View>

        {/* ── Event info ── */}
        {artistEvents.length !== 0 &&
          <View style={{ marginVertical: 30 }}>
            {artistEvents.sort((a, b) => a.dateFrom - b.dateFrom).map((event) => {
              const stage = stageById[event.stageId];
              const category = categoryById[event.categoryId];
              const borderColor = category !== undefined ? decodeCategoryColor(category.color) : colors.textPrimary;
              return (
                <View key={event.eventId} style={{
                  paddingHorizontal: hPad,
                  marginHorizontal: 16,
                  marginTop: 10,
                  borderLeftWidth: 5,
                  borderColor,
                }}>
                  <Text style={{ fontSize: 16, color: colors.textPrimary }}>
                    {stage !== undefined ? getStageLocalized(stage.localized, 'name') : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>{formatDayLabel(event.dateFrom)}</Text>
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>·</Text>
                    <Text style={{ fontSize: 16, color: colors.textSecondary }}>{formatTime(event.dateFrom)}–{formatTime(event.dateTo)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        }

        {content !== '' && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 32 }}>
            <RenderHtml contentWidth={htmlWidth} source={htmlSource} tagsStyles={HTML_TAG_STYLES} />
          </View>
        )}

      </View>
    </View>
  );
}
