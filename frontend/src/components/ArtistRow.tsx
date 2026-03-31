import React from 'react';
import { Image, TouchableOpacity, View } from 'react-native';
import { Text } from './ui/Text';
import type { DbArtist } from '../types/backend';
import type { InterestStatus } from '../context/InterestContext';
import { getArtistLocalized } from '../utils/localization';
import { useInterestCycle } from '../context/InterestContext';
import { useStartProgress } from '../context/ScreenUIContext';
import { StarButton, getFeedbackLabel } from './StarButton';

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

  function handleStarPress(): void {
    const { next, promise } = cycleStatus(artist.artistId);
    startProgress(getFeedbackLabel(next)).wrap(promise);
  }

  return (
    <TouchableOpacity
      onPress={() => onPress(artist)}
      className="flex-row items-center px-4 py-3 border-b border-border bg-background"
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      <View className="w-14 h-14 mr-3 bg-surface overflow-hidden">
        {artist.thumbUrl !== '' ? (
          <Image
            source={{ uri: artist.thumbUrl }}
            className="w-14 h-14"
            resizeMode="cover"
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
      <StarButton status={status} onPress={handleStarPress} />
    </TouchableOpacity>
  );
});
