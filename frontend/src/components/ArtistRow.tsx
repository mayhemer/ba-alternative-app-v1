import React, { useCallback } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Text } from './ui/Text';
import type { DbArtist } from '../types/backend';
import type { InterestStatus } from '../context/InterestContext';
import { getArtistLocalized } from '../utils/localization';
import { useArtistDerived } from '../hooks/useArtistDerived';
import { useInterestCycle } from '../context/InterestContext';
import { useStartProgress } from '../context/ScreenUIContext';
import { StarButton, getFeedbackLabel } from './StarButton';
import { Exclamation } from './ui/Exclamation';

type Props = {
  artist: DbArtist;
  status: InterestStatus;
  onPress: (artist: DbArtist) => void;
};

export const ArtistRow = React.memo(function ArtistRow({ artist, status, onPress }: Props) {
  const { cycleStatus } = useInterestCycle();
  const startProgress = useStartProgress();

  const genre = getArtistLocalized(artist.localized, 'genre');
  const country = getArtistLocalized(artist.localized, 'country');
  const { conflictMap } = useArtistDerived(artist);
  const hasConflict = conflictMap.size > 0;

  const handleStarPress = useCallback((): void => {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }, [artist.artistId, cycleStatus, startProgress]);

  const handlePress = useCallback((): void => {
    onPress(artist);
  }, [onPress, artist]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      className="flex-row items-center px-4 py-3 border-b border-border bg-background"
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View className="w-18 h-14 mr-3 bg-surface overflow-hidden">
        {artist.thumbUrl !== '' ? (
          <ExpoImage
            source={{ uri: artist.thumbUrl }}
            style={{ width: 75, height: 56 }}
            contentFit="cover"
            cachePolicy="memory"
          />
        ) : (
          <View className="w-14 h-14 bg-surface" />
        )}
      </View>

      {/* Artist info */}
      <View className="flex-1 mr-3">
        <Text className="text-textPrimary text-base font-semibold" numberOfLines={1}>
          {artist.name}
        </Text>
        {genre !== '' && (
          <Text className="text-textSecondary text-xs mt-0.5" numberOfLines={1}>
            {genre}
          </Text>
        )}
        {country !== '' && (
          <Text className="text-textSecondary text-xs" numberOfLines={1}>
            {country}
          </Text>
        )}
      </View>

      {/* Star */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {hasConflict && <Exclamation/>}
        <StarButton status={status} onPress={handleStarPress} label="Toggle interest" />
      </View>
    </TouchableOpacity>
  );
});
