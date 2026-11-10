import {
  appLanguage,
  chooseLanguage,
  languageChoice,
  setLanguageChoice,
  setSystemLanguageTags,
  subscribeAppLanguage,
} from './language';

// ── Which language the app shows ──────────────────────────────────────────────
//
// Dimensions: the user's choice in Settings (the system's, English, Czech); the
// system's preferred languages (Czech first, Czech further down, another
// language, none), how the tag is written (bare, with a region, upper case);
// either of them changing.

afterEach(() => {
  setLanguageChoice('system');
  setSystemLanguageTags([]);
});

describe('chooseLanguage', () => {
  it('shows Czech when the system language is Czech, whatever the region or case', () => {
    expect(chooseLanguage(['cs'])).toBe('cs');
    expect(chooseLanguage(['cs-CZ'])).toBe('cs');
    expect(chooseLanguage(['CS'])).toBe('cs');
    expect(chooseLanguage(['cs_CZ'])).toBe('cs');
  });

  it('shows English for English', () => {
    expect(chooseLanguage(['en-US'])).toBe('en');
  });

  it('falls back to English for any other system language', () => {
    expect(chooseLanguage(['de-DE'])).toBe('en');
    expect(chooseLanguage(['sk'])).toBe('en');
  });

  it('follows only the first preferred language, not Czech further down the list', () => {
    expect(chooseLanguage(['de-DE', 'cs-CZ'])).toBe('en');
  });

  it('falls back to English when the system names no language', () => {
    expect(chooseLanguage([])).toBe('en');
  });

  it('follows the system when the choice is the system\'s', () => {
    expect(chooseLanguage(['cs-CZ'], 'system')).toBe('cs');
    expect(chooseLanguage(['en-US'], 'system')).toBe('en');
  });

  it('shows the chosen language whatever the system\'s', () => {
    expect(chooseLanguage(['cs-CZ'], 'en')).toBe('en');
    expect(chooseLanguage(['en-US'], 'cs')).toBe('cs');
    expect(chooseLanguage([], 'cs')).toBe('cs');
  });
});

describe('appLanguage', () => {
  it('is English, following the system, until something is set', () => {
    expect(appLanguage()).toBe('en');
    expect(languageChoice()).toBe('system');
  });

  it('follows the system language while the choice is the system\'s', () => {
    setSystemLanguageTags(['cs-CZ']);
    expect(appLanguage()).toBe('cs');
    setSystemLanguageTags(['de-DE']);
    expect(appLanguage()).toBe('en');
  });

  it('shows the chosen language over the system\'s, and the system\'s again once that is chosen', () => {
    setSystemLanguageTags(['cs-CZ']);
    setLanguageChoice('en');
    expect(languageChoice()).toBe('en');
    expect(appLanguage()).toBe('en');
    setSystemLanguageTags(['cs']);
    expect(appLanguage()).toBe('en');
    setLanguageChoice('system');
    expect(appLanguage()).toBe('cs');
  });

  it('tells subscribers when the language changes', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAppLanguage(listener);
    setSystemLanguageTags(['cs-CZ']);
    expect(listener).toHaveBeenCalledTimes(1);
    setLanguageChoice('en');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    setLanguageChoice('cs');
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('tells subscribers when only the choice changes, for Settings to mark it', () => {
    setSystemLanguageTags(['en-US']);
    const listener = jest.fn();
    const unsubscribe = subscribeAppLanguage(listener);
    setLanguageChoice('en');
    expect(appLanguage()).toBe('en');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('tells subscribers nothing when nothing changes', () => {
    setSystemLanguageTags(['cs-CZ']);
    setLanguageChoice('cs');
    const listener = jest.fn();
    const unsubscribe = subscribeAppLanguage(listener);
    setSystemLanguageTags(['cs']);
    setLanguageChoice('cs');
    setSystemLanguageTags(['en-US']);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
