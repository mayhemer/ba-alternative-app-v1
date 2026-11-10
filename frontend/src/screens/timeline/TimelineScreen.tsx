import { strings } from '../../i18n/strings';
import React from 'react';
import type { DbArtist } from '../../types/backend';
import { BaseTimelineScreen } from './BaseTimelineScreen';
import { DaySwitcher } from './DaySwitcher';

const filterArtist = (a: DbArtist) => a.isPlayable;

function TimelineBottomBar() {
  return <DaySwitcher screenKey="timeline" />;
}

export function TimelineScreen() {
  return (
    <BaseTimelineScreen
      title={strings().screens.program}
      screenKey="timeline"
      filterArtist={filterArtist}
      BottomBarComponent={TimelineBottomBar}
    />
  );
}
