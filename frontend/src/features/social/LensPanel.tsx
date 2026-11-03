import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PanelSectionLabel } from '../../ui/PanelSectionLabel';
import { LensScopeRow } from './LensScopeRow';
import { lensPanelModel, type LensScopeRowModel } from './LensPanel.model';
import { useLens, useLensPanel } from './LensContext';
import { useSocialData, useSocialActions } from './SocialContext';
import { MyScheduleShare } from './MyScheduleShare';
import { SearchEntry } from '../search/SearchEntry';
import { SEARCH_ENTRY_DOCK_HEIGHT } from '../search/SearchDock.model';
import { useInterestCycle } from '../interests/InterestContext';
import { type LensScope } from '../../lib/interestUtils';
import { useLayoutMode } from '../../hooks/useLayoutMode';
import {
  colors,
  OVERLAY_BACKDROP,
  OVERLAY_PANEL_MARGIN,
  OVERLAY_PANEL_RADIUS,
  OVERLAY_PANEL_MAX_WIDTH,
} from '../../styling/tokens';

// ── Panel ─────────────────────────────────────────────────────────────────────

export function LensPanel() {
  const { isOpen, close } = useLensPanel();
  const { scope, setScope } = useLens();
  const { isWide } = useLayoutMode();
  const { friends } = useSocialData();
  const { removeFriend, refreshFriend } = useSocialActions();
  const { refreshFromServer } = useInterestCycle();

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
    () => lensPanelModel({ scope, friends, pendingRemove }),
    [scope, friends, pendingRemove],
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

  if (!isOpen) { return null; }

  return (
    <>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={close}
        style={{ position: 'absolute', inset: 0, backgroundColor: OVERLAY_BACKDROP }}
      />

      {/* Floating card — inset from the screen edges and the TopBar above it, and
          held above the search field at the bottom edge: the frame around it
          ends there and the card shrinks to fit, scrolling its content. Past
          the wide-screen breakpoint it stops growing and stays pinned to the
          right, under the LensChip that opens it and clear of the permanent
          drawer, rather than stretching a dropdown across a desktop window.
          No `overflow: hidden` is needed to keep content off the rounded corners:
          the ScrollView already clips to its own frame, which the padding insets
          past the corner radius — and it would clip the shadow away on iOS. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: OVERLAY_PANEL_MARGIN,
          bottom: SEARCH_ENTRY_DOCK_HEIGHT,
          left: isWide ? undefined : OVERLAY_PANEL_MARGIN,
          right: OVERLAY_PANEL_MARGIN,
          width: isWide ? OVERLAY_PANEL_MAX_WIDTH : undefined,
        }}
      >
        <View
          style={{
            flexShrink: 1,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: OVERLAY_PANEL_RADIUS,
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
          <ScrollView keyboardShouldPersistTaps="handled" style={{ flexGrow: 0 }}>
            {/* ── SHOW ─────────────────────────────────────────────── */}
            <PanelSectionLabel>Show</PanelSectionLabel>

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
            <MyScheduleShare onClose={close} />
          </ScrollView>
        </View>
      </View>

      {/* ── SEARCH, at the bottom edge ─────────────────────────── */}
      <SearchEntry />
    </>
  );
}
