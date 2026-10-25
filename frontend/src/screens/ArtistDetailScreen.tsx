import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import RenderHtml from 'react-native-render-html';
import { Text } from '../components/ui/Text';
import { useArtistEvents, useCategories, useStages } from '../store/cacheStore';
import { colors } from '../styling/tokens';
import type { DbArtist } from '../types/backend';
import { useArtistDerived } from '../hooks/useArtistDerived';
import { useArtistBio } from '../hooks/useArtistBio';
import { useTimelineFilter } from '../context/TimelineFilterContext';
import { navigationRef } from '../navigation/navigationRef';
import { useSocialData } from '../context/SocialContext';
import { FriendPickList } from '../components/social/FriendPickList';
import { ArtistDetailTitle } from '../components/artist/ArtistDetailTitle';
import { artistDetailTitleModel } from '../components/artist/ArtistDetailTitle.model';
import { ArtistSetRow } from '../components/artist/ArtistSetRow';
import { artistSetRowModel, type ArtistSetRowModel } from '../components/artist/ArtistSetRow.model';
import { artistLinksModel, type StreamingSite } from '../components/artist/ArtistLinks.model';
import { heroHeight } from '../components/artist/ArtistHero.model';

const STREAMING_ICON_SIZE = 24;

const STREAMING_ICONS: Record<StreamingSite, number> = {
  'spotify': require('../../assets/spotify-icon-72.png'),
  'tidal': require('../../assets/tidal-icon-72.png'),
  'metal-archives': require('../../assets/metal-archives-icon-72.png'),
  'setlist-fm': require('../../assets/setlist-fm-icon-72.png'),
};

const HTML_TAG_STYLES = {
  body: { color: colors.textPrimary, fontSize: 14, lineHeight: 22 },
  p:    { marginBottom: 12 },
  a:    { color: colors.accent },
};

type Props = { artist: DbArtist };

// ── Header (sticky — rendered outside scroll view) ────────────────────────────

export function ArtistDetailHeader({ artist }: Props) {
  const { closeDetail, expandDetail, status, innerWidth, hPad, isWeb, handleStarPress, conflicts } = useArtistDerived(artist);
  const item = useMemo(
    () => artistDetailTitleModel({ artist, status, hasConflict: conflicts.size > 0, innerWidth, padding: hPad, isWeb }),
    [artist, status, conflicts, innerWidth, hPad, isWeb],
  );
  return <ArtistDetailTitle item={item} onStar={handleStarPress} onExpand={expandDetail} onClose={closeDetail} />;
}

// ── Body (scrollable content) ─────────────────────────────────────────────────

export function ArtistDetailBody({ artist }: Props) {
  const { closeDetail, innerWidth, hPad, width, height, conflicts, openConflict } = useArtistDerived(artist);
  const bio = useArtistBio(artist);
  const { setSelectedDayStart, requestScrollToTime } = useTimelineFilter();
  const { friendsByArtist } = useSocialData();
  const friends = friendsByArtist[artist.artistId] ?? [];

  // Jump to this artist's event on the timeline: select its day, center its time
  // and its category's lane, switch to the matching timeline tab (support vs
  // main), and close the sheet.
  const handleEventPress = useCallback((row: ArtistSetRowModel): void => {
    const screenKey = row.jump.support ? 'support' : 'timeline';
    setSelectedDayStart(row.jump.day);
    requestScrollToTime(screenKey, row.event.dateFrom, row.event.dateTo, row.event.categoryId);
    if (navigationRef.isReady()) {
      if (row.jump.support) {
        navigationRef.navigate('SupportTimeline');
      } else {
        navigationRef.navigate('Timeline');
      }
    }
    closeDetail();
  }, [setSelectedDayStart, requestScrollToTime, closeDetail]);

  const imageHeight = heroHeight(innerWidth, height);
  const links = useMemo(() => artistLinksModel(artist), [artist]);
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

  const rows = useMemo(
    () => artistEvents.map((event) => artistSetRowModel({
      event,
      artist,
      stage: stageById[event.stageId],
      category: categoryById[event.categoryId],
      conflict: conflicts.get(event.eventId),
      padding: hPad,
    })),
    [artistEvents, artist, stageById, categoryById, conflicts, hPad],
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
        {links.shown && (
          <View style={{
            paddingHorizontal: hPad,
            marginTop: 16,
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 18,
          }}>
            {links.streaming.map((link) => (
              <TouchableOpacity key={link.site} onPress={() => Linking.openURL(link.url)}>
                <ExpoImage
                  source={STREAMING_ICONS[link.site]}
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
            ))}
            {links.web !== null && (
              <TouchableOpacity onPress={() => Linking.openURL(links.web!.url)}>
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
                  {links.web.domain} ↗
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
        {rows.length !== 0 &&
          <View style={{ marginVertical: 30 }}>
            {rows.map((row) => (
              <ArtistSetRow key={row.key} item={row} onPress={handleEventPress} onConflict={openConflict} />
            ))}
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
