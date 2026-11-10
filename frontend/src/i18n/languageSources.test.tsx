import { act, renderHook } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appLanguage, languageChoice, setLanguageChoice, setSystemLanguageTags } from './language';
import {
  applySystemLanguage,
  loadLanguageChoice,
  saveLanguageChoice,
  useAppLanguage,
  useLanguageChoice,
} from './languageSources';

// ── Where the language comes from: the system, and the choice in Settings ─────
//
// Dimensions: the system's language (English, Czech), at launch and changing
// while the app runs; the stored choice (none, the system's, English, Czech,
// something unknown from elsewhere).

let mockLocales: { languageTag: string }[] = [{ languageTag: 'en-US' }];
jest.mock('expo-localization', () => ({
  getLocales: () => mockLocales,
  useLocales: () => mockLocales,
}));

function systemSays(tag: string): void {
  mockLocales = [{ languageTag: tag }];
}

beforeEach(async () => {
  systemSays('en-US');
  await AsyncStorage.clear();
});

afterEach(() => {
  setLanguageChoice('system');
  setSystemLanguageTags([]);
});

describe('at launch', () => {
  it('shows the system language', () => {
    systemSays('cs-CZ');
    applySystemLanguage();
    expect(appLanguage()).toBe('cs');
  });

  it('follows the system when nothing was chosen', async () => {
    systemSays('cs-CZ');
    applySystemLanguage();
    await loadLanguageChoice();
    expect(languageChoice()).toBe('system');
    expect(appLanguage()).toBe('cs');
  });

  it('shows the language chosen in an earlier session over the system\'s', async () => {
    saveLanguageChoice('en');
    setLanguageChoice('system'); // a new launch: nothing in memory yet
    systemSays('cs-CZ');
    applySystemLanguage();
    expect(appLanguage()).toBe('cs');
    await loadLanguageChoice();
    expect(languageChoice()).toBe('en');
    expect(appLanguage()).toBe('en');
  });

  it('follows the system when the system\'s was chosen in an earlier session', async () => {
    saveLanguageChoice('system');
    systemSays('cs-CZ');
    applySystemLanguage();
    await loadLanguageChoice();
    expect(languageChoice()).toBe('system');
    expect(appLanguage()).toBe('cs');
  });

  it('follows the system when the stored choice is not one it knows', async () => {
    saveLanguageChoice('cs');
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.setItem(keys[0], 'de');
    setLanguageChoice('system');
    applySystemLanguage();
    await loadLanguageChoice();
    expect(languageChoice()).toBe('system');
    expect(appLanguage()).toBe('en');
  });
});

describe('choosing in Settings', () => {
  it('switches the language at once', () => {
    applySystemLanguage();
    saveLanguageChoice('cs');
    expect(languageChoice()).toBe('cs');
    expect(appLanguage()).toBe('cs');
  });

  it('marks the new choice for Settings', async () => {
    const { result } = await renderHook(() => useLanguageChoice());
    expect(result.current).toBe('system');
    await act(async () => { saveLanguageChoice('en'); });
    expect(result.current).toBe('en');
  });
});

describe('while the app runs (Android, web)', () => {
  it('follows a change of the system language', async () => {
    applySystemLanguage();
    const { result, rerender } = await renderHook(() => useAppLanguage());
    expect(result.current).toBe('en');
    systemSays('cs-CZ');
    await rerender({});
    expect(result.current).toBe('cs');
  });

  it('keeps the chosen language when the system language changes', async () => {
    applySystemLanguage();
    saveLanguageChoice('en');
    const { result, rerender } = await renderHook(() => useAppLanguage());
    systemSays('cs-CZ');
    await rerender({});
    expect(result.current).toBe('en');
  });

  it('follows a choice made in Settings', async () => {
    applySystemLanguage();
    const { result } = await renderHook(() => useAppLanguage());
    await act(async () => { saveLanguageChoice('cs'); });
    expect(result.current).toBe('cs');
  });
});
