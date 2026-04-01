import React from 'react';
import type { DbArtist } from '../types/backend';
import { BaseTimelineScreen } from './BaseTimelineScreen';

const filterArtist = (a: DbArtist) => !a.isPlayable;

export function SupportTimelineScreen() {
  return <BaseTimelineScreen title="Support" filterArtist={filterArtist} useSubRows />;
}
