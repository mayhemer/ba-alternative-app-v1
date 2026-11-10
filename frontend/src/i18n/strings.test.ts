import { setAppLanguage } from './language';
import { strings, stringsFor } from './strings';

// ── The app's strings ─────────────────────────────────────────────────────────
//
// Dimensions: the language (English, Czech, the one currently set) and, for
// counted phrases, the count across each language's plural forms.

afterEach(() => { setAppLanguage('en'); });

/** Every key path in a strings tree, functions and arrays as leaves. */
function keyPaths(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) => {
    const path = `${prefix}${key}`;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return keyPaths(value as object, `${path}.`);
    }
    return [path];
  });
}

describe('stringsFor', () => {
  it('has every English string in Czech too, and nothing else', () => {
    expect(keyPaths(stringsFor('cs')).sort()).toEqual(keyPaths(stringsFor('en')).sort());
  });

  it('has no empty string in either language', () => {
    for (const lang of ['en', 'cs'] as const) {
      const empty = keyPaths(stringsFor(lang)).filter((path) => {
        const value = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], stringsFor(lang));
        return value === '';
      });
      expect(empty).toEqual([]);
    }
  });

  it('gives the same word in each language for a shared label', () => {
    expect(stringsFor('en').setStatus.live).toBe('LIVE');
    expect(stringsFor('cs').setStatus.live).toBe('HRAJE');
    expect(stringsFor('en').conflict.conflict).toBe('Conflict');
    expect(stringsFor('cs').conflict.conflict).toBe('Konflikt');
  });
});

describe('strings', () => {
  it('follows the app language', () => {
    expect(strings().screens.settings).toBe('Settings');
    setAppLanguage('cs');
    expect(strings().screens.settings).toBe('Nastavení');
  });
});

describe('counted phrases', () => {
  it('counts conflicts in English singular and plural', () => {
    const { conflictsLabel } = stringsFor('en').conflict;
    expect(conflictsLabel(1)).toBe('1 conflict');
    expect(conflictsLabel(2)).toBe('2 conflicts');
  });

  it('counts conflicts in all three Czech plural forms', () => {
    const { conflictsLabel } = stringsFor('cs').conflict;
    expect(conflictsLabel(0)).toBe('0 konfliktů');
    expect(conflictsLabel(1)).toBe('1 konflikt');
    expect(conflictsLabel(2)).toBe('2 konflikty');
    expect(conflictsLabel(4)).toBe('4 konflikty');
    expect(conflictsLabel(5)).toBe('5 konfliktů');
  });

  it('counts overlapping sets in English, as before', () => {
    const { overlaps } = stringsFor('en').artistSetRow;
    expect(overlaps(1)).toBe('Overlaps with 1 other event(s)');
    expect(overlaps(3)).toBe('Overlaps with 3 other event(s)');
  });

  it('says one overlapping set apart from more in Czech', () => {
    const { overlaps } = stringsFor('cs').artistSetRow;
    expect(overlaps(1)).toBe('Překrývá se s jiným vystoupením');
    expect(overlaps(2)).toBe('Překrývá se s jinými vystoupeními (2)');
    expect(overlaps(5)).toBe('Překrývá se s jinými vystoupeními (5)');
  });

  it('names one friend and counts more, in English', () => {
    const { pickedByOne, pickedByMany } = stringsFor('en').friendPickList;
    expect(pickedByOne('Ann')).toBe('Ann picked this');
    expect(pickedByMany(3)).toBe('3 friends picked this');
  });

  it('names one friend and counts more in the Czech plural forms', () => {
    const { pickedByOne, pickedByMany } = stringsFor('cs').friendPickList;
    expect(pickedByOne('Ann')).toBe('Ann to má vybrané');
    expect(pickedByMany(2)).toBe('Vybrané to mají 2 přátelé');
    expect(pickedByMany(4)).toBe('Vybrané to mají 4 přátelé');
    expect(pickedByMany(5)).toBe('Vybrané to má 5 přátel');
  });
});

describe('weekdays', () => {
  it('starts the week on Sunday, as Date.getUTCDay counts it', () => {
    expect(stringsFor('en').weekdays.short[0]).toBe('Sun');
    expect(stringsFor('cs').weekdays.short[0]).toBe('Ne');
    expect(stringsFor('cs').weekdays.short[3]).toBe('St');
  });
});
