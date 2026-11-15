import { strings } from '../../i18n/strings';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { PanelSectionLabel } from '../../ui/PanelSectionLabel';
import { copyLinkFeedback, myScheduleShareModel, type MyScheduleShareModel } from './MyScheduleShare.model';
import { useSocialData, useSocialActions } from './SocialContext';
import { useAuth } from '../../auth/AuthContext';
import { useFeedback } from '../../shell/ScreenUIContext';
import { SectionFeedbackToast } from '../../ui/FeedbackToastCard';
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
  /** Drawn at the right end of the heading's line: the toast reporting this section's actions. */
  headingAccessory?: React.ReactNode;
  /**
   * Draws the section as a mock in this colour, for a panel's preview
   * (LensPanelSkeleton): every text and the icon in it.
   */
  skeletonColor?: string;
};

const SIGN_IN_TEXT = { color: colors.accent, fontSize: 13, fontFamily: 'Bold-Default' };
const SIGN_IN_REST_TEXT = { color: colors.notInterested, fontSize: 13 };
const SHARE_TEXT = { color: colors.textPrimary, fontSize: 15 };
const SHARE_BOX = { flex: 1 };
const COPY_TEXT = { color: colors.accent, fontSize: 14 };
const REVOKE_TEXT = { color: colors.danger, fontSize: 14 };

export function MyScheduleShareView({ item, busy, onSignIn, onShare, onCopy, onRevoke, headingAccessory, skeletonColor }: ViewProps) {
  /** A text, in the mock's colour when drawn as one. */
  const text = (value: string, style: object, boxStyle?: object) => (
    <Text style={[style, boxStyle, skeletonColor === undefined ? undefined : { color: skeletonColor }]}>{value}</Text>
  );
  return (
    <>
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
      {/* The toast floats over the heading's line, centred on it, so showing it
          moves nothing in the panel. */}
      <View style={{ zIndex: 1 }}>
        <PanelSectionLabel skeletonColor={skeletonColor}>{strings().myScheduleShare.heading}</PanelSectionLabel>
        <View
          pointerEvents="box-none"
          style={{ position: 'absolute', top: -20, bottom: -20, left: 0, right: 0, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}
        >
          {headingAccessory}
        </View>
      </View>

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
            accessibilityLabel={strings().myScheduleShare.signIn}
          >
            {text(strings().myScheduleShare.signIn, SIGN_IN_TEXT)}
          </Pressable>
          {text(strings().myScheduleShare.signInRest, SIGN_IN_REST_TEXT)}
        </View>
      ) : (
        <>
          <Pressable
            onPress={onShare}
            disabled={busy}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}
          >
            <Ionicons name="share-outline" size={20} color={skeletonColor ?? colors.accent} style={{ marginRight: 10 }} />
            {text(item.shareLabel, SHARE_TEXT, SHARE_BOX)}
            {busy && <ActivityIndicator size="small" color={colors.notInterested} />}
          </Pressable>

          {item.canCopyOrRevoke && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
              <Pressable onPress={onCopy} style={{ paddingVertical: 8, paddingRight: 16 }}>
                {text(strings().myScheduleShare.copyLink, COPY_TEXT)}
              </Pressable>
              <Pressable onPress={onRevoke} style={{ paddingVertical: 8 }}>
                {text(strings().myScheduleShare.revoke, REVOKE_TEXT)}
              </Pressable>
            </View>
          )}
        </>
      )}
    </>
  );
}

/** Its messages show in its own heading, next to the buttons that caused them. */
const IN_SECTION = { anchor: { kind: 'my-schedule' } } as const;

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
      const result = await shareLink(share.url, strings().myScheduleShare.shareMessage);
      if (result === 'copied') { showFeedback(strings().myScheduleShare.linkCopied, 'confirmation', IN_SECTION); }
    } catch (err) {
      const message = err instanceof Error ? err.message : strings().myScheduleShare.createFailed;
      showFeedback(message, 'warning', IN_SECTION);
    } finally {
      setBusy(false);
    }
  }, [shareMine, showFeedback]);

  const handleCopy = useCallback(async () => {
    if (myShare === null) { return; }
    const { text, variant } = copyLinkFeedback(await copyToClipboard(myShare.url));
    showFeedback(text, variant, IN_SECTION);
  }, [myShare, showFeedback]);

  const handleRevoke = useCallback(async () => {
    setBusy(true);
    try {
      await revokeMine();
      showFeedback(strings().myScheduleShare.revoked, 'confirmation', IN_SECTION);
    } finally {
      setBusy(false);
    }
  }, [revokeMine, showFeedback]);

  return (
    <MyScheduleShareView
      headingAccessory={<SectionFeedbackToast section="my-schedule" />}
      item={item}
      busy={busy}
      onSignIn={goToSettings}
      onShare={handleShare}
      onCopy={handleCopy}
      onRevoke={handleRevoke}
    />
  );
}
