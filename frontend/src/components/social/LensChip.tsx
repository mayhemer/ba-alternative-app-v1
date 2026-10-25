import React, { useMemo } from 'react';
import { useLens, useLensPanel } from '../../context/LensContext';
import { useSocialData } from '../../context/SocialContext';
import { lensChipModel } from './LensChip.model';
import { LensChipView } from './LensChipView';

// TopBar entry point for the view/share lens: reads the lens, the focused
// friend and the panel's state for the chip's model; the chip itself is
// LensChipView. Tapping it toggles the Lens panel. Dismissing the drawer is
// the exclusivity hub's job — see utils/overlayHub.
export function LensChip() {
  const { scope } = useLens();
  const { toggle, isOpen } = useLensPanel();
  const { getFriend } = useSocialData();
  const friend = scope.kind === 'friend' ? getFriend(scope.token) : undefined;
  const item = useMemo(
    () => lensChipModel({ scope, friend: friend !== undefined ? { label: friend.label, avatarUrl: friend.avatarUrl } : undefined, isOpen }),
    [scope, friend, isOpen],
  );
  return <LensChipView item={item} onPress={toggle} />;
}
