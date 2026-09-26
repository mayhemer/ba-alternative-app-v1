import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import RenderHtml from 'react-native-render-html';
import { Text } from '../components/ui/Text';
import { StarButton } from '../components/StarButton';
import { getStageLocalized } from '../utils/localization';
import { formatTime, formatDayLabel, getFestivalDayStart } from '../components/timeline/timelineLayout';
import { useArtistEvents, useCategories, useStages } from '../store/cacheStore';
import { decodeCategoryColor } from '../utils/color';
import { colors } from '../styling/tokens';
import type { DbArtist, DbEvent } from '../types/backend';
import { useArtistDerived } from '../hooks/useArtistDerived';
import { useArtistBio } from '../hooks/useArtistBio';
import { fitFontSize } from '../utils/textFit';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { navigationRef } from '../navigation/navigationRef';
import { Exclamation, ExclamationTouchable } from '../components/ui/Exclamation';
import { useSocialData } from '../context/SocialContext';
import { FriendPickList } from '../components/social/FriendPickList';

const STREAMING_ICON_SIZE = 24;

// Header title size at full scale; long names step down once by
// TEXT_SHRINK_SCALE — see utils/textFit.
const TITLE_FONT_SIZE = 24;
const TITLE_LINES = 3;
const TITLE_MARGIN_RIGHT = 8;

// Widths of the controls sharing the title's row, used to work out how much
// room the title actually has.
const STAR_BUTTON_WIDTH = 32;   // StarButton size="large" icon
const CONFLICT_ICON_WIDTH = 24; // ExclamationTouchable default size
const HEADER_ROW_GAP = 4;
const WEB_CLOSE_WIDTH = 30;     // ✕ glyph plus its marginLeft

const HTML_TAG_STYLES = {
  body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  p:    { marginBottom: 12 },
  a:    { color: colors.accent },
};

type Props = { artist: DbArtist };

// ── Header (sticky — rendered outside scroll view) ────────────────────────────

export function ArtistDetailHeader({ artist }: Props) {
  const { closeDetail, expandDetail, status, innerWidth, hPad, isWeb, meta, handleStarPress, conflictMap } = useArtistDerived(artist);
  const hasConflict = conflictMap.size > 0;

  // Title size is picked here rather than by adjustsFontSizeToFit — see
  // utils/textFit for why that prop cannot hold a floor under Fabric. The
  // controls to the right of the title vary with state, so subtract only the
  // ones actually rendered.
  const controlsWidth =
    STAR_BUTTON_WIDTH +
    (hasConflict ? CONFLICT_ICON_WIDTH + HEADER_ROW_GAP : 0) +
    (isWeb ? WEB_CLOSE_WIDTH : 0);
  const titleWidth = innerWidth - hPad * 2 - TITLE_MARGIN_RIGHT - controlsWidth;
  const titleFontSize = fitFontSize(artist.name.length, titleWidth, TITLE_LINES, TITLE_FONT_SIZE);

  return (
    <View style={{
      alignSelf: 'center',
      width: innerWidth,
      paddingHorizontal: hPad,
      paddingTop: 12,
      paddingBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Text
          numberOfLines={TITLE_LINES}
          style={{
            color: colors.textPrimary,
            flex: 1,
            fontSize: titleFontSize,
            fontWeight: '700',
            fontFamily: 'Bold-Default',
            marginRight: TITLE_MARGIN_RIGHT,
          }}
        >
          {artist.name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {hasConflict && <ExclamationTouchable onPress={expandDetail} />}
          <StarButton status={status} onPress={handleStarPress} label="Toggle interest" size="large" />
          {isWeb && (
            <TouchableOpacity onPress={closeDetail} hitSlop={8} style={{ marginLeft: 16 }}>
              <Text style={{ fontSize: 20, color: colors.textSecondary, lineHeight: 36 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
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
  const { closeDetail, innerWidth, heroHeight, hPad, artistNameForURL, artistWebDomain, width, conflictMap, openConflict } = useArtistDerived(artist);
  const bio = useArtistBio(artist);
  const { setSelectedDayStart, requestScrollToTime } = useTimelineFilter();
  const { friendsByArtist } = useSocialData();
  const friends = friendsByArtist[artist.artistId] ?? [];

  // Jump to this artist's event on the timeline: select its day, center its time
  // and its category's lane, switch to the matching timeline tab (support vs
  // main), and close the sheet.
  const handleEventPress = useCallback((event: DbEvent): void => {
    const isSupport = !artist.isPlayable;
    const screenKey = isSupport ? 'support' : 'timeline';
    setSelectedDayStart(getFestivalDayStart(event.dateFrom));
    requestScrollToTime(screenKey, event.dateFrom, event.dateTo, event.categoryId);
    if (navigationRef.isReady()) {
      if (isSupport) {
        navigationRef.navigate('SupportTimeline');
      } else {
        navigationRef.navigate('Timeline');
      }
    }
    closeDetail();
  }, [artist.isPlayable, setSelectedDayStart, requestScrollToTime, closeDetail]);

  const imageHeight = heroHeight;
  const htmlWidth   = innerWidth - hPad * 2;
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => { setImageLoading(true); }, [artist.artistId]);

  // Escape-to-close lives in navigation/BackHistoryTracker, which owns the one
  // dismissal order shared by the back button and the keyboard.

  // Subscribed reads: this body used to call the cache getters straight through
  // and re-rendered only because useArtistBio (a subscriber) sat beside it.
  const cachedArtistEvents = useArtistEvents(artist.slug, artist.artistId);
  // Sorted copy: the hook hands back the cache's own array, so sorting it in
  // place (as this render used to) reordered the cached data for every other
  // reader — and would now attempt to write to the shared frozen empty value.
  const artistEvents = useMemo(
    () => [...cachedArtistEvents].sort((a, b) => a.dateFrom - b.dateFrom),
    [cachedArtistEvents],
  );
  const stagesForSlug = useStages(artist.slug);
  const categoriesForSlug = useCategories(artist.slug);
  const stageById = useMemo(
    () => Object.fromEntries(stagesForSlug.map((s) => [s.stageId, s])),
    [stagesForSlug],
  );
  const categoryById = useMemo(
    () => Object.fromEntries(categoriesForSlug.map((c) => [c.categoryId, c])),
    [categoriesForSlug],
  );

  const bioHtml = bio.state === 'ready' ? bio.content : '';
  const htmlSource = useMemo(() => ({ html: bioHtml }), [bioHtml]);

  return (
    <View style={{ width, alignItems: 'center' }}>
      <View style={{ width: innerWidth }}>

        {/* Friends who picked this artist. Lives here rather than in the sticky
            header so that expanding the list scrolls with the content instead of
            growing the header. Renders nothing when no friend picked. */}
        <View style={{ paddingHorizontal: hPad }}>
          <FriendPickList friends={friends} />
        </View>

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
                  // Bundled assets: the bundle is already their persistent copy, so a
                  // disk-cache round trip buys nothing and puts them in the same queue
                  // as the hero's ~300 kB download — which is what kept them blank
                  // until it finished. Memory + high priority keeps them independent.
                  cachePolicy="memory"
                  priority="high"
                />
              </TouchableOpacity>
            )}
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://tidal.com/search?q=${artistNameForURL}`)}>
                <ExpoImage
                  source={require('../../assets/tidal-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                  // Bundled assets: the bundle is already their persistent copy, so a
                  // disk-cache round trip buys nothing and puts them in the same queue
                  // as the hero's ~300 kB download — which is what kept them blank
                  // until it finished. Memory + high priority keeps them independent.
                  cachePolicy="memory"
                  priority="high"
                />
              </TouchableOpacity>
            )}
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.metal-archives.com/search?searchString=${artistNameForURL}&type=band_name`)}>
                <ExpoImage
                  source={require('../../assets/metal-archives-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                  // Bundled assets: the bundle is already their persistent copy, so a
                  // disk-cache round trip buys nothing and puts them in the same queue
                  // as the hero's ~300 kB download — which is what kept them blank
                  // until it finished. Memory + high priority keeps them independent.
                  cachePolicy="memory"
                  priority="high"
                />
              </TouchableOpacity>
            )}
            {artist.isPlayable && (
              <TouchableOpacity onPress={() => Linking.openURL(`https://www.setlist.fm/search?query=${artistNameForURL}`)}>
                <ExpoImage
                  source={require('../../assets/setlist-fm-icon-72.png')}
                  style={{ width: STREAMING_ICON_SIZE, height: STREAMING_ICON_SIZE }}
                  contentFit="contain"
                  // Bundled assets: the bundle is already their persistent copy, so a
                  // disk-cache round trip buys nothing and puts them in the same queue
                  // as the hero's ~300 kB download — which is what kept them blank
                  // until it finished. Memory + high priority keeps them independent.
                  cachePolicy="memory"
                  priority="high"
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
            // Same URL the artist row renders, so this shares its cache entry.
            cachePolicy="memory-disk"
            onLoadEnd={() => setImageLoading(false)}
          />
          {imageLoading && (
            <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
        </View>

        {/* ── Event info ── */}
        {artistEvents.length !== 0 &&
          <View style={{ marginVertical: 30 }}>
            {artistEvents.map((event) => {
              const stage = stageById[event.stageId];
              const category = categoryById[event.categoryId];
              const borderColor = category !== undefined ? decodeCategoryColor(category.color) : colors.textPrimary;
              const hasConflict = conflictMap.has(event.eventId);

              return (
                <View
                  key={event.eventId}
                  style={{
                    marginHorizontal: hPad,
                    paddingHorizontal: 16,
                    marginTop: 10,
                    borderLeftWidth: 5,
                    borderColor,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleEventPress(event)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 16, color: colors.textPrimary }}>
                        {stage !== undefined ? getStageLocalized(stage.localized, 'name') : ''}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{formatDayLabel(event.dateFrom)}</Text>
                      <Text style={{ fontSize: 16, color: colors.textSecondary }}>·</Text>
                      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{formatTime(event.dateFrom)}–{formatTime(event.dateTo)}</Text>
                    </View>
                  </TouchableOpacity>
                  {hasConflict && (
                    <TouchableOpacity
                      onPress={() => openConflict(event, conflictMap.get(event.eventId) ?? [])}
                      activeOpacity={0.75}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}
                    >
                      <Exclamation/>
                      <Text style={{ color: colors.danger }}>
                        Overlaps with {conflictMap.get(event.eventId)?.length} other event(s)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        }

        {/* Three outcomes, deliberately distinct: the bios are still on their
            way, they could not be fetched (offline), or they arrived and this
            artist simply has none — the last renders nothing, as before. */}
        {bio.state === 'loading' && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 32 }}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {bio.state === 'unavailable' && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 32 }}>
            <Text style={{ fontSize: 13, color: colors.textSecondary }}>
              Biography unavailable offline.
            </Text>
          </View>
        )}

        {bio.state === 'ready' && bio.content !== '' && (
          <View style={{ paddingHorizontal: hPad, paddingTop: 16, paddingBottom: 32 }}>
            <RenderHtml contentWidth={htmlWidth} source={htmlSource} tagsStyles={HTML_TAG_STYLES} />
          </View>
        )}

      </View>
    </View>
  );
}
