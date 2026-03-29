import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { InterestStatus } from '../context/InterestContext';
import { useArtistListFilter } from '../context/ArtistListFilterContext';

// Module-level component — registered as TopBar RightComponent.
// Reads its own context directly; no props needed.

type FilterButton = {
  status: InterestStatus | null;
  icon: string;
  label: string;
};

const FILTER_BUTTONS: FilterButton[] = [
  { status: null,       icon: '≡',  label: 'All'      },
  { status: 'maybe',    icon: '✦',  label: 'Maybe'    },
  { status: 'must_see', icon: '★',  label: 'Must see' },
];

export function InterestFilterControl() {
  const { interestFilter, setInterestFilter } = useArtistListFilter();

  return (
    <View className="flex-row items-center gap-1">
      {FILTER_BUTTONS.map((btn) => {
        const isActive = interestFilter === btn.status;
        return (
          <TouchableOpacity
            key={btn.label}
            onPress={() => setInterestFilter(btn.status)}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            accessibilityLabel={btn.label}
            accessibilityRole="button"
          >
            <Text
              style={{
                fontSize: 16,
                color: isActive ? '#e8c84a' : '#555555',
              }}
            >
              {btn.icon}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
