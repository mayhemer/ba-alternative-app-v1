import { appLanguage, chooseLanguage, setAppLanguage, subscribeAppLanguage } from './language';

// ── Which language the app shows ──────────────────────────────────────────────
//
// Dimensions: the system's preferred languages (Czech first, Czech further down,
// another language, none), how the tag is written (bare, with a region, upper
// case), and the current language changing.

afterEach(() => { setAppLanguage('en'); });

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
});

describe('appLanguage', () => {
  it('is English until something sets it', () => {
    expect(appLanguage()).toBe('en');
  });

  it('reads back what was set', () => {
    setAppLanguage('cs');
    expect(appLanguage()).toBe('cs');
  });

  it('tells subscribers about a change, and only about a change', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeAppLanguage(listener);
    setAppLanguage('en');
    expect(listener).not.toHaveBeenCalled();
    setAppLanguage('cs');
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    setAppLanguage('en');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
