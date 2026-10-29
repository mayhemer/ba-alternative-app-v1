import { sectionLetter } from './SectionSeparator.model';

// ── The letter an artist is listed under ──────────────────────────────────────

describe('sectionLetter', () => {
  it('is the first letter, upper case', () => {
    expect(sectionLetter('gojira')).toBe('G');
  });

  it('folds a diacritic onto its letter', () => {
    expect(sectionLetter('ÖSTERREICH')).toBe('O');
    expect(sectionLetter('ČAD')).toBe('C');
  });

  it('puts a name starting with a digit under "#"', () => {
    expect(sectionLetter('3 INCHES OF BLOOD')).toBe('#');
  });

  it('keeps punctuation as its own heading', () => {
    expect(sectionLetter('(DOLCH)')).toBe('(');
  });

  it('puts an empty name under "#"', () => {
    expect(sectionLetter('')).toBe('#');
  });
});
