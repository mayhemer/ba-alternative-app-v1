import * as Font from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';

// ── Fonts the app draws with ──────────────────────────────────────────────────
//
// Loaded behind the splash (StartupGate), so nothing is ever drawn before its
// font is in.
//
// Ionicons is here as well, not just the text faces: an @expo/vector-icons icon
// whose font is not loaded yet renders an empty glyph, loads the font itself,
// and re-renders once it has. Every star on the first screen after the splash
// would do that — a flash of missing icons, and one extra commit of the screen.
// Preloaded, every icon mounts with its glyph.

export const APP_FONTS = {
  'Regular-Default': require('../../assets/WorkSans-Regular.ttf'),
  'Bold-Default': require('../../assets/WorkSans-Bold.ttf'),
  //'Regular-Default': require('../../assets/DarkerGrotesque-Regular.ttf'),
  //'Bold-Default': require('../../assets/DarkerGrotesque-Bold.ttf'),
  ...Ionicons.font,
};

/**
 * Loads every font the app uses. Never rejects: a font that fails to load falls
 * back to the system face, which is no reason to keep the app from opening.
 * Cheap to repeat — already-loaded fonts resolve at once.
 */
export async function loadFonts(): Promise<void> {
  await Font.loadAsync(APP_FONTS).catch(() => undefined);
}
