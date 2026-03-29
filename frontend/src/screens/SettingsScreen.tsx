import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useAppContext } from '../store/AppContext';
import { getSlugs } from '../adapters/slugAdapter';

export function SettingsScreen() {
  useTopBar({ title: 'Settings' });
  useBottomBar({});

  const { state, setSelectedSlug } = useAppContext();
  const { selectedSlug } = state;

  const [slugs, setSlugs] = React.useState<string[]>([]);

  React.useEffect(() => {
    getSlugs().then(setSlugs);
  }, []);

  return (
    <View className="flex-1 bg-background px-6 pt-8">
      <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
        Festival Edition
      </Text>

      {slugs.map((slug) => {
        const isSelected = slug === selectedSlug;
        return (
          <TouchableOpacity
            key={slug}
            onPress={() => setSelectedSlug(slug)}
            className="py-4 border-b border-border flex-row items-center justify-between"
          >
            <Text
              className={
                isSelected
                  ? 'text-accent text-base font-semibold'
                  : 'text-textPrimary text-base'
              }
            >
              {slug.toUpperCase()}
            </Text>
            {isSelected && (
              <Text className="text-accent text-xs tracking-widest uppercase">
                Active
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
