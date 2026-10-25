import React from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Text } from '../components/ui/Text';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../context/AuthContext';
import { useLayoutMode } from '../hooks/useLayoutMode';
import { getSlugs } from '../adapters/slugAdapter';
import { accountModel, editionRowModels } from './SettingsScreen.model';

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection() {
  const { isLoggedIn, isRestoringSession, email, name, signInWithGoogle, signInWithApple, signOut } =
    useAuth();
  const [isBusy, setIsBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = React.useCallback(
    async (provider: 'google' | 'apple') => {
      setError(null);
      setIsBusy(true);
      try {
        if (provider === 'google') {
          await signInWithGoogle();
        } else {
          await signInWithApple();
        }
      } catch (err: unknown) {
        // Don't surface "cancelled" — user intentionally closed the browser
        if (err instanceof Error && err.message !== 'cancelled') {
          // Debugging: log full error and surface its real message in the UI so
          // the actual failure reason is visible on-device, not just a generic string.
          if (__DEV__) { console.error('[settings] sign-in error', provider, err); }
          // Show the real reason only in dev; a generic message in release builds.
          const detail = err instanceof Error ? err.message : String(err);
          setError(__DEV__ ? detail : 'Sign-in failed. Please try again.');
        }
      } finally {
        setIsBusy(false);
      }
    },
    [signInWithGoogle, signInWithApple],
  );

  const handleSignOut = React.useCallback(async () => {
    setError(null);
    await signOut();
  }, [signOut]);

  const account = accountModel({ isRestoringSession, isLoggedIn, name, email, isBusy, error });

  if (account.kind === 'restoring') {
    return (
      <View className="mb-8">
        <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
          Account
        </Text>
        <ActivityIndicator color="#888" />
      </View>
    );
  }

  if (account.kind === 'signed-in') {
    return (
      <View className="mb-8">
        <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
          Account
        </Text>
        <View className="py-4 border-b border-border">
          <Text className={account.subtitle !== null ? 'text-textPrimary text-base font-semibold' : 'text-textPrimary text-base'}>
            {account.title}
          </Text>
          {account.subtitle !== null && (
            <Text className="text-textSecondary text-sm mt-1">{account.subtitle}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSignOut}
          className="mt-4 py-3 px-4 border border-border rounded-lg items-center"
        >
          <Text className="text-textSecondary text-sm">Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mb-8">
      <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
        Account
      </Text>
      {account.error !== null && (
        <Text className="text-red-400 text-sm mb-3">{account.error}</Text>
      )}
      <TouchableOpacity
        onPress={() => handleSignIn('google')}
        disabled={account.busy}
        className="mb-3 py-3 px-4 bg-white rounded-lg flex-row items-center justify-center"
      >
        <Text className="text-black text-sm font-semibold">
          {account.googleLabel}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleSignIn('apple')}
        disabled={account.busy}
        className="py-3 px-4 bg-black border border-border rounded-lg flex-row items-center justify-center"
      >
        <Text className="text-white text-sm font-semibold">
          {account.appleLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function SettingsScreen() {
  useTopBar({ title: 'Settings' });
  useBottomBar({});

  const { state, setSelectedSlug } = useAppContext();
  const { selectedSlug } = state;
  const { bottomClearance } = useLayoutMode();

  const [slugs, setSlugs] = React.useState<string[]>([]);

  React.useEffect(() => {
    getSlugs().then(setSlugs);
  }, []);

  return (
    // Scrollable: the account block, sign-in buttons and edition list already
    // fill a portrait phone, and overflow well past a landscape one.
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 32 + bottomClearance }}
    >
      <AccountSection />

      <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
        Festival Edition
      </Text>

      {editionRowModels(slugs, selectedSlug).map((row) => (
        <TouchableOpacity
          key={row.key}
          onPress={() => setSelectedSlug(row.key)}
          className="py-4 border-b border-border flex-row items-center justify-between"
        >
          <Text
            className={
              row.active
                ? 'text-accent text-base font-semibold'
                : 'text-textPrimary text-base'
            }
          >
            {row.label}
          </Text>
          {row.active && (
            <Text className="text-accent text-xs tracking-widest uppercase">
              Active
            </Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
