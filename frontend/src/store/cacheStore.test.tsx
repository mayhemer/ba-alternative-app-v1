import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { createDataCollector, populateCache, setBiosLoading } from '../cache/cacheService';
import { useArtists, useBiosLoading, useCacheVersion } from './cacheStore';
import type { DbArtist } from '../types/backend';

import artistsFixture from '../../tests/fixtures/generated/ba2025/artists.json';

// ── Helpers ───────────────────────────────────────────────────────────────────
// RNTL 14 is async throughout — `render`, `unmount` and `act` all return
// promises — so every case here awaits. Skipping an await silently interleaves
// act scopes and the queries then report "render has not been called".

const ARTISTS = artistsFixture as unknown as DbArtist[];
const SYNCED_AT = Date.parse('2025-08-06T09:00:00+02:00');

let slugCounter = 0;
const freshSlug = (): string => `storetest${++slugCounter}`;

function populate(slug: string, artists: DbArtist[], syncedAt = SYNCED_AT): void {
  const collector = createDataCollector();
  collector.setArtists(artists);
  collector.setCategories([]);
  collector.setStages([]);
  collector.setEvents([]);
  populateCache(slug, collector.build(), syncedAt);
}

// A cache write happens outside React, so it has to be wrapped for the
// subscription's setState to be flushed before the assertion.
async function write(fn: () => void): Promise<void> {
  await act(async () => { fn(); });
}

// Renders nothing but what it read and how often it rendered, so a case can tell
// "the data changed" apart from "the component was merely told something did".
function ArtistCount({ slug }: { slug: string }) {
  const artists = useArtists(slug);
  const renders = React.useRef(0);
  renders.current += 1;
  return <Text>{`${artists.length}/${renders.current}`}</Text>;
}

// ── Subscription ──────────────────────────────────────────────────────────────
// The point of the store: reading subscribes. A reader cannot opt out, and so
// cannot go stale — which is exactly what the old opt-in emitter allowed.

describe('a component reading through the store', () => {
  it('sees data already in the cache on its first render', async () => {
    const slug = freshSlug();
    populate(slug, ARTISTS.slice(0, 3));

    await render(<ArtistCount slug={slug} />);

    // No empty frame to flash: the snapshot is read during render, not in an effect.
    expect(screen.getByText('3/1')).toBeTruthy();
  });

  it('re-renders when a sync populates the cache', async () => {
    const slug = freshSlug();
    await render(<ArtistCount slug={slug} />);
    expect(screen.getByText('0/1')).toBeTruthy();

    await write(() => populate(slug, ARTISTS.slice(0, 5)));

    expect(screen.getByText('5/2')).toBeTruthy();
  });

  it('does not re-render for a write to a different edition', async () => {
    const slug = freshSlug();
    await render(<ArtistCount slug={slug} />);

    await write(() => populate(freshSlug(), ARTISTS.slice(0, 5)));

    // The version bumped, but this reader's own snapshot did not change.
    expect(screen.getByText('0/1')).toBeTruthy();
  });

  it('tracks the bio loading flag', async () => {
    const slug = freshSlug();

    function BioState() {
      return <Text>{useBiosLoading(slug) ? 'loading' : 'idle'}</Text>;
    }
    await render(<BioState />);
    expect(screen.getByText('idle')).toBeTruthy();

    await write(() => setBiosLoading(slug, true));
    expect(screen.getByText('loading')).toBeTruthy();

    await write(() => setBiosLoading(slug, false));
    expect(screen.getByText('idle')).toBeTruthy();
  });

  it('exposes a version that advances on every write', async () => {
    function Version() {
      return <Text>{`v${useCacheVersion()}`}</Text>;
    }
    await render(<Version />);
    const first = screen.getByText(/^v\d+$/).props.children as string;

    await write(() => populate(freshSlug(), ARTISTS.slice(0, 2)));

    const second = screen.getByText(/^v\d+$/).props.children as string;
    expect(Number(second.slice(1))).toBeGreaterThan(Number(first.slice(1)));
  });

  it('stops listening once unmounted', async () => {
    const slug = freshSlug();
    const view = await render(<ArtistCount slug={slug} />);
    await view.unmount();

    // Would warn about updating an unmounted component if the subscription leaked.
    await expect(write(() => populate(slug, ARTISTS.slice(0, 4)))).resolves.toBeUndefined();
  });
});
