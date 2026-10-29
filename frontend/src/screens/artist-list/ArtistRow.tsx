import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Text } from '../../ui/Text';
import type { DbArtist } from '../../types/backend';
import { useInterestCycle } from '../../features/interests/InterestContext';
import { useStartProgress } from '../../shell/ScreenUIContext';
import { StarButton, getFeedbackLabel } from '../../features/interests/StarButton';
import { FriendFacepile } from '../../features/social/FriendFacepile';
import { sameProps } from '../../ui/sameProps';
import type { ArtistRowModel } from './ArtistRow.model';

// ── An artist row ─────────────────────────────────────────────────────────────
//
// Draws its model (ArtistRow.model.ts). A tap on the row opens the artist; the
// star cycles my pick.

type Props = {
  item: ArtistRowModel;
  onPress: (artist: DbArtist) => void;
};

function ArtistRowBase({ item, onPress }: Props) {
  const { cycleStatus } = useInterestCycle();
  const startProgress = useStartProgress();
  const { artist } = item;

  const handleStarPress = useCallback((): void => {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next), next).wrap(promise);
  }, [artist.artistId, cycleStatus, startProgress]);

  const handlePress = useCallback((): void => {
    onPress(artist);
  }, [onPress, artist]);

  // The star is a sibling of the touchable, not inside it. Nested, iOS merges it
  // into the row's accessibility label, so VoiceOver (and Maestro) can only open
  // the detail and never reach the star itself.
  return (
    <View className="flex-row items-center pr-4 border-b border-border bg-background">
      <TouchableOpacity
        onPress={handlePress}
        className="flex-1 flex-row items-center pl-4 py-3"
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View className="w-18 h-14 mr-3 bg-surface overflow-hidden">
          {item.thumbUrl !== null ? (
            // Disk-backed on purpose: the list unmounts rows as they scroll off, so a
            // memory-only policy re-downloads ~280 kB per row every time one comes back.
            // The corpus is bounded (~44 MB for a full edition, and the detail hero reuses
            // this exact URL) and both platforms evict it themselves — Glide by a 250 MB
            // LRU, SDWebImage by a one-week age limit.
            <ExpoImage
              source={{ uri: item.thumbUrl }}
              style={{ width: 75, height: 56 }}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View className="w-14 h-14 bg-surface" />
          )}
        </View>

        {/* Artist info */}
        <View className="flex-1 mr-3">
          <Text className="text-textPrimary text-base font-semibold" numberOfLines={1}>
            {item.name}
          </Text>
          {item.genre !== null && (
            <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
              {item.genre}
            </Text>
          )}
          {item.country !== null && (
            <Text className="text-textSecondary text-xs" numberOfLines={1}>
              {item.country}
            </Text>
          )}
        </View>

        {/* Friends who picked this artist */}
        {item.friends.length > 0 && (
          <View className="mr-3">
            <FriendFacepile friends={item.friends} size={20} />
          </View>
        )}
      </TouchableOpacity>

      {/* Star */}
      <StarButton status={item.status} onPress={handleStarPress} label="Toggle interest" />
    </View>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const ArtistRow = React.memo(ArtistRowBase, sameProps);
