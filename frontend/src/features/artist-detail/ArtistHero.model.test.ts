import { heroHeight } from './ArtistHero.model';

// ── The hero image's height ───────────────────────────────────────────────────

describe('heroHeight', () => {
  it('is 3:2 of the content width in portrait', () => {
    expect(heroHeight(400, 800)).toBe(266);
  });

  it('is capped at the viewport height in landscape', () => {
    expect(heroHeight(700, 390)).toBe(390);
  });
});
