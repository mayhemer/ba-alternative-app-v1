import React from 'react';
import type { DbArtist } from '../types/backend';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { DaySwitcher } from '../components/timeline/DaySwitcher';

const filterArtist = (a: DbArtist) => !a.isPlayable;

function SupportBottomBar() {
  return <DaySwitcher screenKey="support" />;
}

export function SupportTimelineScreen() {
  return (
    <BaseTimelineScreen
      title="Support"
      screenKey="support"
      filterArtist={filterArtist}
      useSubRows
      BottomBarComponent={SupportBottomBar}
    />
  );
}
