import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// ── Jest mocks — must appear before importing the module under test ────────────

jest.mock('./db', () => ({
  queryAll: jest.fn(),
  getItem: jest.fn(),
  putItem: jest.fn(),
  deleteItem: jest.fn(),
  queryUserInterestsBySlug: jest.fn(),
  querySyncState: jest.fn(),
}));

import { handler } from './handler';
import { queryAll, getItem, querySyncState } from './db';
import type { DbArtist, DbArtistListItem, DbArtistBio, DbSyncState } from '../../shared/types';

const mockQueryAll       = queryAll       as jest.MockedFunction<typeof queryAll>;
const mockGetItem        = getItem        as jest.MockedFunction<typeof getItem>;
const mockQuerySyncState = querySyncState as jest.MockedFunction<typeof querySyncState>;

// ── Fixture data ──────────────────────────────────────────────────────────────

const ARTIST: DbArtist = {
  slug: 'ba2025',
  artistId: '42',
  name: 'Behemoth',
  isPlayable: true,
  imageUrl: 'https://img/full.jpg',
  thumbUrl: 'https://img/thumb.jpg',
  url: 'https://behemoth.example',
  localized: [
    { language: 'CS', name: 'Behemoth', content: '<p>Dlouhý životopis</p>', genre: 'Black Metal', country: 'PL' },
    { language: 'EN', name: 'Behemoth', content: '<p>A long bio</p>',       genre: 'Black Metal', country: 'PL' },
  ],
};

const BASE_ENV = {
  ARTISTS_TABLE:    'ba-artists',
  SYNC_STATE_TABLE: 'ba-sync-state',
};

function event(routeKey: string, pathParameters: Record<string, string>): APIGatewayProxyEventV2 {
  return { routeKey, pathParameters } as unknown as APIGatewayProxyEventV2;
}

async function call(routeKey: string, pathParameters: Record<string, string>) {
  const result = await handler(event(routeKey, pathParameters));
  const structured = result as APIGatewayProxyStructuredResultV2;
  return {
    statusCode: structured.statusCode,
    body: JSON.parse(structured.body ?? 'null') as unknown,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(process.env, BASE_ENV);
});

afterEach(() => {
  for (const key of Object.keys(BASE_ENV)) delete process.env[key];
});

// ── GET /{slug}/artists ───────────────────────────────────────────────────────

describe('GET /{slug}/artists', () => {
  it('serves the artist without the per-language bio', async () => {
    mockQueryAll.mockResolvedValue([ARTIST]);

    const { statusCode, body } = await call('GET /{slug}/artists', { slug: 'ba2025' });
    const artists = body as DbArtistListItem[];

    expect(statusCode).toBe(200);
    expect(mockQueryAll).toHaveBeenCalledWith('ba-artists', 'ba2025');
    expect(artists).toHaveLength(1);
    for (const localized of artists[0].localized) {
      expect(localized).not.toHaveProperty('content');
    }
  });

  it('keeps every other field of the stored item intact', async () => {
    mockQueryAll.mockResolvedValue([ARTIST]);

    const { body } = await call('GET /{slug}/artists', { slug: 'ba2025' });
    const [artist] = body as DbArtistListItem[];

    expect(artist).toMatchObject({
      slug: 'ba2025',
      artistId: '42',
      name: 'Behemoth',
      isPlayable: true,
      thumbUrl: 'https://img/thumb.jpg',
    });
    expect(artist.localized.map(l => l.language)).toEqual(['CS', 'EN']);
    expect(artist.localized[0]).toMatchObject({ genre: 'Black Metal', country: 'PL' });
  });

  it('does not mutate the item it was given', async () => {
    mockQueryAll.mockResolvedValue([ARTIST]);

    await call('GET /{slug}/artists', { slug: 'ba2025' });

    expect(ARTIST.localized[0].content).toBe('<p>Dlouhý životopis</p>');
  });
});

// ── GET /{slug}/artists/{artistId}/bio ────────────────────────────────────────

describe('GET /{slug}/artists/{artistId}/bio', () => {
  it('serves one bio per language and nothing else', async () => {
    mockGetItem.mockResolvedValue(ARTIST);

    const { statusCode, body } = await call(
      'GET /{slug}/artists/{artistId}/bio',
      { slug: 'ba2025', artistId: '42' },
    );

    expect(statusCode).toBe(200);
    expect(mockGetItem).toHaveBeenCalledWith('ba-artists', { slug: 'ba2025', artistId: '42' });
    expect(body as DbArtistBio[]).toEqual([
      { language: 'CS', content: '<p>Dlouhý životopis</p>' },
      { language: 'EN', content: '<p>A long bio</p>' },
    ]);
  });

  it('404s for an unknown artist', async () => {
    mockGetItem.mockResolvedValue(null);

    const { statusCode } = await call(
      'GET /{slug}/artists/{artistId}/bio',
      { slug: 'ba2025', artistId: 'nope' },
    );

    expect(statusCode).toBe(404);
  });
});

// ── GET /{slug}/validity ──────────────────────────────────────────────────────

describe('GET /{slug}/validity', () => {
  const syncState = (tableName: string, lastSyncedAt: number): DbSyncState => ({
    slug: 'ba2025',
    tableName,
    lastOfficialUpdate: lastSyncedAt,
    lastSyncedAt,
    dataVersion: String(lastSyncedAt),
  });

  it('answers with the newest watermark and no caller-specific field', async () => {
    mockQuerySyncState.mockResolvedValue([syncState('artists', 1000), syncState('schedule', 2000)]);

    const { statusCode, body } = await call('GET /{slug}/validity', { slug: 'ba2025' });

    expect(statusCode).toBe(200);
    expect(body).toEqual({ lastSyncedAt: 2000 });
  });

  it('reports 0 when the slug has never been synced', async () => {
    mockQuerySyncState.mockResolvedValue([]);

    const { body } = await call('GET /{slug}/validity', { slug: 'ba2099' });

    expect(body).toEqual({ lastSyncedAt: 0 });
  });
});
