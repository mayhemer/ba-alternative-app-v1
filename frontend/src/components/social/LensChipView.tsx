import React, { memo } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { FriendAvatar } from './FriendAvatar';
import { TopBarChip } from '../layout/TopBarChip';
import { sameProps } from '../sameProps';
import type { LensChipModel } from './LensChip.model';

// ── The lens chip, drawn ──────────────────────────────────────────────────────
//
// Draws its model (LensChip.model.ts) in the top bar's shared "state + ⋮"
// frame (TopBarChip).

const AVATAR_SIZE = 22;
const STAR_SIZE = 20;

function LensChipViewBase({ item, onPress }: { item: LensChipModel; onPress: () => void }) {
  return (
    <TopBarChip onPress={onPress} accessibilityLabel="View and share schedules" dotsColor={item.dotsColor}>
      {item.state.kind === 'friend' ? (
        <FriendAvatar label={item.state.label} avatarUrl={item.state.avatarUrl} size={AVATAR_SIZE} status="will_go" />
      ) : (
        <Ionicons name={item.state.icon} size={STAR_SIZE} color={item.state.color} />
      )}
    </TopBarChip>
  );
}

/** Renders again only when what it shows changes (sameProps). */
export const LensChipView = memo(LensChipViewBase, sameProps);
