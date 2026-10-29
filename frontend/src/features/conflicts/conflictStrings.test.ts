import { conflictStrings } from './conflictStrings';

describe('conflictStrings', () => {
  it('has every English string in Czech too', () => {
    const en = conflictStrings('en');
    const cs = conflictStrings('cs');
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
    expect(en.conflict).toBe('Conflict');
    expect(cs.conflict).toBe('Konflikt');
  });

  it('falls back to English for an unknown language', () => {
    expect(conflictStrings('de')).toEqual(conflictStrings('en'));
  });

  it('counts conflicts in English singular and plural', () => {
    const { conflictsLabel } = conflictStrings('en');
    expect(conflictsLabel(1)).toBe('1 conflict');
    expect(conflictsLabel(2)).toBe('2 conflicts');
  });

  it('counts conflicts in all three Czech plural forms', () => {
    const { conflictsLabel } = conflictStrings('cs');
    expect(conflictsLabel(0)).toBe('0 konfliktů');
    expect(conflictsLabel(1)).toBe('1 konflikt');
    expect(conflictsLabel(2)).toBe('2 konflikty');
    expect(conflictsLabel(4)).toBe('4 konflikty');
    expect(conflictsLabel(5)).toBe('5 konfliktů');
  });
});
