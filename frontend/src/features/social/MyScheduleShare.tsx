import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { PanelSectionLabel } from '../../ui/PanelSectionLabel';
import { myScheduleShareModel, type MyScheduleShareModel } from './MyScheduleShare.model';
import { useSocialData, useSocialActions } from './SocialContext';
import { useAuth } from '../../auth/AuthContext';
import { useFeedback } from '../../shell/ScreenUIContext';
import { shareLink, copyToClipboard } from './shareLink';
import { navigationRef } from '../../navigation/navigationRef';
import { colors } from '../../styling/tokens';

// ── "My schedule" ─────────────────────────────────────────────────────────────
//
// The section both the lens panel and My plan's filter panel end with, below a
// divider: sign in, or share my schedule, copy the link and revoke it. Draws
// its model (MyScheduleShare.model.ts). The connected MyScheduleShare holds the
// actions; the panel it sits in passes its close, as Sign in leaves the panel
// for Settings.

type ViewProps = {
  item: MyScheduleShareModel;
  /** A share or revoke is in progress. */
  busy: boolean;
  onSignIn: () => void;
  onShare: () => void;
  onCopy: () => void;
  onRevoke: () => void;
};

export function MyScheduleShareView({ item, busy, onSignIn, onShare, onCopy, onRevoke }: ViewProps) {
  return (
    <>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
      <PanelSectionLabel>My schedule</PanelSectionLabel>

      {item.kind === 'signed-out' ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            paddingHorizontal: 8,
            paddingVertical: 8,
          }}
        >
          <Pressable
            onPress={onSignIn}
            hitSlop={20}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={{ color: colors.accent, fontSize: 13, fontFamily: 'Bold-Default' }}>
              Sign in
            </Text>
          </Pressable>
          <Text style={{ color: colors.notInterested, fontSize: 13 }}>
            {' to share your schedule.'}
          </Text>
        </View>
      ) : (
        <>
          <Pressable
            onPress={onShare}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}
          >
            <Ionicons name="share-outline" size={20} color={colors.accent} style={{ marginRight: 10 }} />
            <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>
              {item.shareLabel}
            </Text>
            {busy && <ActivityIndicator size="small" color={colors.notInterested} />}
          </Pressable>

          {item.canCopyOrRevoke && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
              <Pressable onPress={onCopy} style={{ paddingVertical: 8, paddingRight: 16 }}>
                <Text style={{ color: colors.accent, fontSize: 14 }}>Copy link</Text>
              </Pressable>
              <Pressable onPress={onRevoke} style={{ paddingVertical: 8 }}>
                <Text style={{ color: colors.danger, fontSize: 14 }}>Revoke</Text>
              </Pressable>
            </View>
          )}
        </>
      )}
    </>
  );
}

export function MyScheduleShare({ onClose }: { onClose: () => void }) {
  const { myShare } = useSocialData();
  const { shareMine, revokeMine } = useSocialActions();
  const { isLoggedIn } = useAuth();
  const showFeedback = useFeedback();
  const [busy, setBusy] = useState(false);

  const item = useMemo(
    () => myScheduleShareModel({ isLoggedIn, hasShare: myShare !== null }),
    [isLoggedIn, myShare],
  );

  // The panels render above NavigationContainer, so this navigates through the
  // module-level ref rather than useNavigation.
  const goToSettings = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Settings');
    }
    onClose();
  }, [onClose]);

  const handleShare = useCallback(async () => {
    setBusy(true);
    try {
      const share = await shareMine();
      const result = await shareLink(share.url, 'Check out my festival schedule');
      if (result === 'copied') { showFeedback('Link copied', 'confirmation'); }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not create link';
      showFeedback(message, 'warning');
    } finally {
      setBusy(false);
    }
  }, [shareMine, showFeedback]);

  const handleCopy = useCallback(async () => {
    if (myShare === null) { return; }
    const ok = await copyToClipboard(myShare.url);
    showFeedback(ok ? 'Link copied' : myShare.url, 'confirmation');
  }, [myShare, showFeedback]);

  const handleRevoke = useCallback(async () => {
    setBusy(true);
    try {
      await revokeMine();
      showFeedback('Share link revoked', 'confirmation');
    } finally {
      setBusy(false);
    }
  }, [revokeMine, showFeedback]);

  return (
    <MyScheduleShareView
      item={item}
      busy={busy}
      onSignIn={goToSettings}
      onShare={handleShare}
      onCopy={handleCopy}
      onRevoke={handleRevoke}
    />
  );
}
