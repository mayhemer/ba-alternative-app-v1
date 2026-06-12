import React from 'react';
import type { DbArtist } from '../types/backend';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { DaySwitcher } from '../components/timeline/DaySwitcher';

const filterArtist = (a: DbArtist) => a.isPlayable;

function TimelineBottomBar() {
  return <DaySwitcher screenKey="timeline" />;
}

export function TimelineScreen() {
  return (
    <BaseTimelineScreen
      title="Timeline"
      screenKey="timeline"
      filterArtist={filterArtist}
      BottomBarComponent={TimelineBottomBar}
    />
  );
}
