import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../ui/Text';
import { FriendAvatar } from './FriendAvatar';
import { StarFilterButton } from '../InterestFilterControl';
import { useLens, useLensPanel } from '../../context/LensContext';
import { useSocialData, useSocialActions } from '../../context/SocialContext';
import { useAuth } from '../../context/AuthContext';
import { useFeedback } from '../../context/ScreenUIContext';
import { type InterestStatus } from '../../context/InterestContext';
import { type LensScope, type ScopeLevel } from '../../utils/interestUtils';
import { shareLink, copyToClipboard } from '../../utils/shareLink';
import { extractShareToken } from '../../adapters/baShareApiAdapter';
import { colors } from '../../styling/tokens';

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

// ── A selectable source row ──────────────────────────────────────────────────────

type RowProps = {
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
};

function ScopeRow({ active, onPress, children }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: active ? colors.surfaceRaised : 'transparent',
      }}
    >
      <Ionicons
        name={active ? 'radio-button-on' : 'radio-button-off'}
        size={18}
        color={active ? colors.accent : colors.notInterested}
        style={{ marginRight: 10 }}
      />
      {children}
    </Pressable>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function LensPanel() {
  const { isOpen, close } = useLensPanel();
  const { scope, setScope } = useLens();
  const { friends, myShare } = useSocialData();
  const { shareMine, revokeMine, addFriend, removeFriend } = useSocialActions();
  const { isLoggedIn } = useAuth();
  const showFeedback = useFeedback();

  const [addOpen, setAddOpen] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);

  const selectScope = useCallback(
    (next: LensScope) => {
      setScope(next);
      close();
    },
    [setScope, close],
  );

  const setLevel = useCallback(
    (next: InterestStatus | null) => {
      // StarFilterButton only ever emits null/'maybe'/'must_see'.
      const level: ScopeLevel = next === 'maybe' || next === 'must_see' ? next : null;
      if (scope.kind === 'me') { setScope({ kind: 'me', level }); }
      else if (scope.kind === 'friend') { setScope({ kind: 'friend', token: scope.token, level }); }
    },
    [scope, setScope],
  );

  const handleAddFriend = useCallback(async () => {
    const token = extractShareToken(tokenInput);
    if (token === null) { return; }
    setBusy(true);
    try {
      const friend = await addFriend(token);
      setTokenInput('');
      setAddOpen(false);
      setScope({ kind: 'friend', token: friend.token, level: null });
      close();
      showFeedback(`Added ${friend.label}'s schedule`, 'confirmation');
    } catch {
      showFeedback('Could not load that link', 'warning');
    } finally {
      setBusy(false);
    }
  }, [tokenInput, addFriend, setScope, close, showFeedback]);

  const handleRemoveFriend = useCallback(
    async (token: string) => {
      if (scope.kind === 'friend' && scope.token === token) { setScope({ kind: 'all' }); }
      await removeFriend(token);
    },
    [removeFriend, scope, setScope],
  );

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

  const myLevel: ScopeLevel = scope.kind === 'me' ? scope.level : null;

  return (
    <>
      {/* Backdrop — taps outside the card dismiss the panel */}
      <Pressable
        onPress={close}
        style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
      />

      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderColor: colors.border,
          maxHeight: '85%',
          paddingHorizontal: 12,
          paddingTop: 10,
          paddingBottom: 14,
        }}
      >
        <ScrollView keyboardShouldPersistTaps="handled">
          {/* ── SHOW ─────────────────────────────────────────────── */}
          <SectionLabel>Show</SectionLabel>

          <ScopeRow active={scope.kind === 'all'} onPress={() => selectScope({ kind: 'all' })}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>Everything</Text>
          </ScopeRow>

          <ScopeRow
            active={scope.kind === 'me'}
            onPress={() => selectScope({ kind: 'me', level: null })}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>My picks</Text>
            {scope.kind === 'me' && (
              <StarFilterButton value={myLevel} onChange={setLevel} />
            )}
          </ScopeRow>

          {friends.map((friend) => {
            const active = scope.kind === 'friend' && scope.token === friend.token;
            const level: ScopeLevel = active ? scope.level : null;
            return (
              <ScopeRow
                key={friend.token}
                active={active}
                onPress={() => selectScope({ kind: 'friend', token: friend.token, level: null })}
              >
                <FriendAvatar label={friend.label} avatarUrl={friend.avatarUrl} size={22} />
                <Text
                  numberOfLines={1}
                  style={{ color: colors.textPrimary, fontSize: 15, flex: 1, marginLeft: 8 }}
                >
                  {friend.label}
                </Text>
                {active && <StarFilterButton value={level} onChange={setLevel} />}
                <Pressable onPress={() => handleRemoveFriend(friend.token)} hitSlop={8} style={{ marginLeft: 10 }}>
                  <Ionicons name="close-circle-outline" size={20} color={colors.notInterested} />
                </Pressable>
              </ScopeRow>
            );
          })}

          {/* ── FRIENDS ──────────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <SectionLabel>Friends</SectionLabel>

          {addOpen ? (
            <View style={{ paddingHorizontal: 8 }}>
              <TextInput
                value={tokenInput}
                onChangeText={setTokenInput}
                placeholder="Paste a friend's link…"
                placeholderTextColor={colors.notInterested}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  height: 40,
                  paddingHorizontal: 10,
                  backgroundColor: colors.surfaceRaised,
                  color: colors.textPrimary,
                  fontSize: 14,
                  borderRadius: 8,
                }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                <Pressable onPress={() => { setAddOpen(false); setTokenInput(''); }} style={{ paddingVertical: 8, paddingHorizontal: 14 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleAddFriend}
                  disabled={busy || extractShareToken(tokenInput) === null}
                  style={{ paddingVertical: 8, paddingHorizontal: 14 }}
                >
                  <Text style={{ color: colors.accent, fontSize: 14, fontFamily: 'Bold-Default' }}>
                    {busy ? 'Adding…' : 'Add'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setAddOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.friend} style={{ marginRight: 10 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 15 }}>Add a friend's link…</Text>
            </Pressable>
          )}

          {/* ── MY SCHEDULE ──────────────────────────────────────── */}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 10 }} />
          <SectionLabel>My schedule</SectionLabel>

          {!isLoggedIn ? (
            <Text style={{ color: colors.notInterested, fontSize: 13, paddingHorizontal: 8, paddingVertical: 8 }}>
              Sign in (Settings) to share your schedule.
            </Text>
          ) : (
            <>
              <Pressable
                onPress={handleShareMine}
                disabled={busy}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8 }}
              >
                <Ionicons name="share-outline" size={20} color={colors.accent} style={{ marginRight: 10 }} />
                <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>
                  {myShare === null ? 'Share my schedule' : 'Share again'}
                </Text>
                {busy && <ActivityIndicator size="small" color={colors.notInterested} />}
              </Pressable>

              {myShare !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 }}>
                  <Pressable onPress={handleCopyMine} style={{ paddingVertical: 8, paddingRight: 16 }}>
                    <Text style={{ color: colors.friend, fontSize: 14 }}>Copy link</Text>
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
