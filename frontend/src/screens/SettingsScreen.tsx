import React from 'react';
import { TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Text } from '../components/ui/Text';
import { useTopBar, useBottomBar } from '../context/ScreenUIContext';
import { useAppContext } from '../store/AppContext';
import { useAuth } from '../context/AuthContext';
import { getSlugs } from '../adapters/slugAdapter';

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection() {
  const { isLoggedIn, isRestoringSession, email, signInWithGoogle, signInWithApple, signOut } =
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
          setError('Sign-in failed. Please try again.');
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

  if (isRestoringSession) {
    return (
      <View className="mb-8">
        <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
          Account
        </Text>
        <ActivityIndicator color="#888" />
      </View>
    );
  }

  if (isLoggedIn) {
    return (
      <View className="mb-8">
        <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
          Account
        </Text>
        <View className="py-4 border-b border-border">
          <Text className="text-textPrimary text-base">{email}</Text>
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
      {error !== null && (
        <Text className="text-red-400 text-sm mb-3">{error}</Text>
      )}
      <TouchableOpacity
        onPress={() => handleSignIn('google')}
        disabled={isBusy}
        className="mb-3 py-3 px-4 bg-white rounded-lg flex-row items-center justify-center"
      >
        <Text className="text-black text-sm font-semibold">
          {isBusy ? 'Signing in…' : 'Sign in with Google'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleSignIn('apple')}
        disabled={isBusy}
        className="py-3 px-4 bg-black border border-border rounded-lg flex-row items-center justify-center"
      >
        <Text className="text-white text-sm font-semibold">
          {isBusy ? 'Signing in…' : 'Sign in with Apple'}
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

  const [slugs, setSlugs] = React.useState<string[]>([]);

  React.useEffect(() => {
    getSlugs().then(setSlugs);
  }, []);

  return (
    <View className="flex-1 bg-background px-6 pt-8">
      <AccountSection />

      <Text className="text-textSecondary text-xs tracking-widest uppercase mb-4">
        Festival Edition
      </Text>

      {slugs.map((slug) => {
        const isSelected = slug === selectedSlug;
        return (
          <TouchableOpacity
            key={slug}
            onPress={() => setSelectedSlug(slug)}
            className="py-4 border-b border-border flex-row items-center justify-between"
          >
            <Text
              className={
                isSelected
                  ? 'text-accent text-base font-semibold'
                  : 'text-textPrimary text-base'
              }
            >
              {slug.toUpperCase()}
            </Text>
            {isSelected && (
              <Text className="text-accent text-xs tracking-widest uppercase">
                Active
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
