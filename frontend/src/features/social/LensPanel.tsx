import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { LensScopeRow } from './LensScopeRow';
import { lensPanelModel, type LensScopeRowModel } from './LensPanel.model';
import { useLens, useLensPanel } from './LensContext';
import { useSocialData, useSocialActions } from './SocialContext';
import { useAuth } from '../../auth/AuthContext';
import { useFeedback } from '../../shell/ScreenUIContext';
import { useInterestCycle } from '../interests/InterestContext';
import { type LensScope } from '../interests/interestUtils';
import { shareLink, copyToClipboard } from './shareLink';
import { navigationRef } from '../../navigation/navigationRef';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import {
  colors,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_RADIUS,
  OVERLAY_PANEL_MAX_WIDTH,
} from '../../styling/tokens';

// ── Section header ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 6,
        marginTop: 4,
      }}
    >
      {children}
    </Text>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function LensPanel() {
  const { isOpen, close } = useLensPanel();
  const { scope, setScope } = useLens();
  const { isWide, height, bottomClearance } = useLayoutMode();
  const { friends, myShare } = useSocialData();
  const { shareMine, revokeMine, removeFriend, refreshFriend } = useSocialActions();
  const { refreshFromServer } = useInterestCycle();
  const { isLoggedIn } = useAuth();
  const showFeedback = useFeedback();
  const [busy, setBusy] = useState(false);

  // Removing a friend is destructive and was a single tap away, so the ✕ now
  // only arms the row; a second, differently-placed tap confirms. Held here
  // rather than per row so that arming one row disarms any other.
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  // The panel stays mounted while closed, so drop any armed row on close —
  // reopening should never present a half-completed destructive action.
  useEffect(() => {
    if (!isOpen) { setPendingRemove(null); }
  }, [isOpen]);

  const selectScope = useCallback(
    (next: LensScope) => {
      // Refresh the latest data for the chosen source before showing it — my view
      // re-merges with the server (picks up edits from another device); a friend's
      // view re-fetches their link. Fire-and-forget so the view switches instantly
      // and updates when the data arrives. Runs even when re-selecting the current
      // source; merely closing the panel does not refresh.
      if (next.kind === 'friend') {
        refreshFriend(next.token).catch(() => undefined);
      } else {
        refreshFromServer().catch(() => undefined);
      }
      setScope(next);
      close();
    },
    [refreshFriend, refreshFromServer, setScope, close],
  );

  const model = useMemo(
    () => lensPanelModel({ scope, friends, pendingRemove, isLoggedIn, hasShare: myShare !== null }),
    [scope, friends, pendingRemove, isLoggedIn, myShare],
  );

  // While armed, a friend's row is an escape hatch rather than a selector:
  // tapping anywhere outside the explicit Remove backs out.
  const handleRowPress = useCallback((row: LensScopeRowModel): void => {
    if (row.friend?.confirming === true) {
      setPendingRemove(null);
    } else {
      selectScope(row.scope);
    }
  }, [selectScope]);
  const handleArm = useCallback((token: string): void => { setPendingRemove(token); }, []);
  const handleDisarm = useCallback((): void => { setPendingRemove(null); }, []);

  // Reads the lens at the tap, not as a dependency: a callback that changed
  // with the lens would render every source row again on each lens change.
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const handleRemoveFriend = useCallback(
    async (token: string) => {
      setPendingRemove(null);
      const current = scopeRef.current;
      if (current.kind === 'friend' && current.token === token) { setScope({ kind: 'all' }); }
      await removeFriend(token);
    },
    [removeFriend, setScope],
  );

  // The panel renders above NavigationContainer, so it navigates through the
  // module-level ref rather than useNavigation.
  const goToSettings = useCallback(() => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Settings');
    }
    close();
  }, [close]);

  const handleShareMine = useCallback(async () => {
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

  const handleCopyMine = useCallback(async () => {
    if (myShare === null) { return; }
    const ok = await copyToClipboard(myShare.url);
    showFeedback(ok ? 'Link copied' : myShare.url, 'confirmation');
  }, [myShare, showFeedback]);

  const handleRevokeMine = useCallback(async () => {
    setBusy(true);
    try {
      await revokeMine();
      showFeedback('Share link revoked', 'confirmation');
    } finally {
      setBusy(false);
    }
  }, [revokeMine, showFeedback]);

  if (!isOpen) { return null; }

  return (
    <>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={close}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
      />

      {/* Floating card — inset from the screen edges and the TopBar above it. Past
          the wide-screen breakpoint it stops growing and stays pinned to the right,
          under the LensChip that opens it and clear of the permanent drawer, rather
          than stretching a dropdown across the full width of a desktop window.
          No `overflow: hidden` is needed to keep content off the rounded corners:
          the ScrollView already clips to its own frame, which the padding insets
          past the corner radius — and it would clip the shadow away on iOS. */}
      <View
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          left: isWide ? undefined : OVERLAY_PANEL_MARGIN,
          right: OVERLAY_PANEL_MARGIN,
          width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: OVERLAY_PANEL_RADIUS,
          // Measured against the real viewport rather than a percentage, so a
          // short screen leaves the panel a usable amount of room without
          // pushing it past the bottom edge or behind the floating BottomBar.
          maxHeight: height - OVERLAY_PANEL_MARGIN * 2 - bottomClearance,
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 14,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 12,
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* ── SHOW ─────────────────────────────────────────────── */}
          <SectionLabel>Show</SectionLabel>

          {model.rows.map((row) => (
            <LensScopeRow
              key={row.key}
              item={row}
              onPress={handleRowPress}
              onArm={handleArm}
              onDisarm={handleDisarm}
              onRemove={handleRemoveFriend}
            />
          ))}

          {/* ── MY SCHEDULE ──────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <SectionLabel>My schedule</SectionLabel>

          {model.mySchedule.kind === 'signed-out' ? (
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
                onPress={goToSettings}
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
                onPress={handleShareMine}
                disabled={busy}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}
              >
                <Ionicons name="share-outline" size={20} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>
                  {model.mySchedule.shareLabel}
                </Text>
                {busy && <ActivityIndicator size="small" color={colors.notInterested} />}
              </Pressable>

              {model.mySchedule.canCopyOrRevoke && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
                  <Pressable onPress={handleCopyMine} style={{ paddingVertical: 8, paddingRight: 16 }}>
                    <Text style={{ color: colors.accent, fontSize: 14 }}>Copy link</Text>
                  </Pressable>
                  <Pressable onPress={handleRevokeMine} style={{ paddingVertical: 8 }}>
                    <Text style={{ color: colors.danger, fontSize: 14 }}>Revoke</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}
