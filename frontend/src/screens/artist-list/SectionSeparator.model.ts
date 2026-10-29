// ── A letter header of the artist list: what it shows ─────────────────────────
//
// The letter an artist is listed under, from the first character of the name:
// diacritics folded ("Ö" → "O"), upper case, a digit → "#". Any other character
// (punctuation) is its own heading.
// The list groups by it and the header shows it, so the two cannot disagree.

export function sectionLetter(name: string): string {
  const first = name.charAt(0);
  if (/\d/.test(first)) {
    return '#';
  }
  const base = first.normalize('NFD').replace(/\p{M}/gu, '');
  return base.toUpperCase() || '#';
}
