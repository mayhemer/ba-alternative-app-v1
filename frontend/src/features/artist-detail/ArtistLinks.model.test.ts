import { artistLinksModel } from './ArtistLinks.model';
import type { DbArtist } from '../../types/backend';

// ── The artist sheet's links, as a model ──────────────────────────────────────

function artist(overrides: Partial<DbArtist>): DbArtist {
  return { slug: 't', artistId: 'a1', name: 'Rotting Christ', isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [], ...overrides };
}

describe('artistLinksModel', () => {
  it('searches a band\'s name, lower case, on the four sites', () => {
    expect(artistLinksModel(artist({})).streaming).toEqual([
      { site: 'spotify', url: 'https://open.spotify.com/search/rotting%20christ' },
      { site: 'tidal', url: 'https://tidal.com/search?q=rotting%20christ' },
      { site: 'metal-archives', url: 'https://www.metal-archives.com/search?searchString=rotting%20christ&type=band_name' },
      { site: 'setlist-fm', url: 'https://www.setlist.fm/search?query=rotting%20christ' },
    ]);
  });

  it('shows the web page as its domain, without "www."', () => {
    expect(artistLinksModel(artist({ url: 'https://www.rotting-christ.com/tour' })).web)
      .toEqual({ url: 'https://www.rotting-christ.com/tour', domain: 'rotting-christ.com' });
  });

  it('has no web chip for a URL that does not parse', () => {
    expect(artistLinksModel(artist({ url: 'not a url' })).web).toBeNull();
  });

  it('gives a support artist its web page only, and no row at all without one', () => {
    expect(artistLinksModel(artist({ isPlayable: false, url: 'https://museum.cz' }))).toMatchObject({ shown: true, streaming: [] });
    expect(artistLinksModel(artist({ isPlayable: false })).shown).toBe(false);
  });
});
