import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

// ── Jest mocks — must appear before importing the module under test ────────────

jest.mock('./db', () => ({
  queryAll: jest.fn(),
  getItem: jest.fn(),
  putItem: jest.fn(),
  deleteItem: jest.fn(),
  queryUserInterestsBySlug: jest.fn(),
  queryUserNotesBySlug: jest.fn(),
  querySyncState: jest.fn(),
}));

import { handler } from './handler';
import { getItem, putItem, queryAll, querySyncState, queryUserInterestsBySlug, queryUserNotesBySlug } from './db';
import type {
  DbArtist, DbArtistListItem, DbArtistBios, DbShareToken, DbSyncState, DbUserInterest, DbUserNote,
} from '../../shared/types';

const mockQueryAll       = queryAll       as jest.MockedFunction<typeof queryAll>;
const mockQuerySyncState = querySyncState as jest.MockedFunction<typeof querySyncState>;
const mockGetItem        = getItem        as jest.MockedFunction<typeof getItem>;
const mockPutItem        = putItem        as jest.MockedFunction<typeof putItem>;
const mockQueryInterests = queryUserInterestsBySlug as jest.MockedFunction<typeof queryUserInterestsBySlug>;
const mockQueryNotes     = queryUserNotesBySlug as jest.MockedFunction<typeof queryUserNotesBySlug>;

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

// Extra event fields for authenticated routes: a request body and the JWT claims
// API Gateway injects.
type EventExtras = { body?: string; sub?: string };

function event(
  routeKey: string,
  pathParameters: Record<string, string>,
  { body, sub }: EventExtras = {},
): APIGatewayProxyEventV2 {
  const requestContext = sub === undefined ? undefined : { authorizer: { jwt: { claims: { sub } } } };
  return { routeKey, pathParameters, body, requestContext } as unknown as APIGatewayProxyEventV2;
}

async function call(routeKey: string, pathParameters: Record<string, string>, extras?: EventExtras) {
  const result = await handler(event(routeKey, pathParameters, extras));
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

// ── GET /{slug}/bios ──────────────────────────────────────────────────────────

describe('GET /{slug}/bios', () => {
  it('serves every artist\'s bios keyed by id, per language', async () => {
    mockQueryAll.mockResolvedValue([ARTIST]);

    const { statusCode, body } = await call('GET /{slug}/bios', { slug: 'ba2025' });

    expect(statusCode).toBe(200);
    expect(mockQueryAll).toHaveBeenCalledWith('ba-artists', 'ba2025');
    expect(body as DbArtistBios[]).toEqual([{
      artistId: '42',
      localized: [
        { language: 'CS', content: '<p>Dlouhý životopis</p>' },
        { language: 'EN', content: '<p>A long bio</p>' },
      ],
    }]);
  });

  it('carries nothing but the bios — no name, image or genre', async () => {
    mockQueryAll.mockResolvedValue([ARTIST]);

    const { body } = await call('GET /{slug}/bios', { slug: 'ba2025' });
    const [entry] = body as DbArtistBios[];

    expect(Object.keys(entry).sort()).toEqual(['artistId', 'localized']);
    for (const localized of entry.localized) {
      expect(Object.keys(localized).sort()).toEqual(['content', 'language']);
    }
  });

  it('serves an empty list for a slug with no artists', async () => {
    mockQueryAll.mockResolvedValue([]);

    const { statusCode, body } = await call('GET /{slug}/bios', { slug: 'ba2099' });

    expect(statusCode).toBe(200);
    expect(body).toEqual([]);
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
    expect(body).toEqual({ lastSyncedAt: 2000, artistsSyncedAt: 1000 });
  });

  it('holds artistsSyncedAt steady when only the schedule was rebuilt', async () => {
    mockQuerySyncState.mockResolvedValue([syncState('artists', 1000), syncState('schedule', 5000)]);

    const { body } = await call('GET /{slug}/validity', { slug: 'ba2025' });

    // The overall watermark moves so the client repopulates, but the artists
    // one does not — which is what lets it keep its cached bios.
    expect(body).toEqual({ lastSyncedAt: 5000, artistsSyncedAt: 1000 });
  });

  it('reports 0 for both when the slug has never been synced', async () => {
    mockQuerySyncState.mockResolvedValue([]);

    const { body } = await call('GET /{slug}/validity', { slug: 'ba2099' });

    expect(body).toEqual({ lastSyncedAt: 0, artistsSyncedAt: 0 });
  });
});

// ── PUT /user/{slug}/schedule/{artistId} ──────────────────────────────────────

describe('PUT /user/{slug}/schedule/{artistId}', () => {
  const put = (status: unknown) => call(
    'PUT /user/{slug}/schedule/{artistId}',
    { slug: 'ba2025', artistId: '42' },
    { body: JSON.stringify({ status }), sub: 'user-1' },
  );

  it.each(['will_go', 'maybe', 'dont_go'])('stores status %s', async (status) => {
    const { statusCode, body } = await put(status);

    expect(statusCode).toBe(200);
    expect(mockPutItem).toHaveBeenCalledWith(
      undefined, // table name from env, not set here
      expect.objectContaining({ userId: 'user-1', slugArtistId: 'ba2025#42', status }),
    );
    expect(body).toEqual(expect.objectContaining({ status }));
  });

  // 'none' is a removal and goes through DELETE, which keeps a timestamped
  // soft-delete record; a PUT of it would bypass that contract.
  it.each(['none', 'must_see', 'yes', undefined])('rejects status %s', async (status) => {
    const { statusCode } = await put(status);

    expect(statusCode).toBe(400);
    expect(mockPutItem).not.toHaveBeenCalled();
  });
});

// ── GET /share/{token} ────────────────────────────────────────────────────────

describe('GET /share/{token}', () => {
  it('returns every stored status, dont_go included — hiding it is up to the viewer', async () => {
    const token: DbShareToken = { token: 't1', userId: 'user-1', slug: 'ba2025', createdAt: 1, label: 'Friend' };
    const interests: DbUserInterest[] = [
      { userId: 'user-1', slugArtistId: 'ba2025#1', status: 'will_go', updatedAt: 1 },
      { userId: 'user-1', slugArtistId: 'ba2025#2', status: 'dont_go', updatedAt: 2 },
    ];
    mockGetItem.mockResolvedValue(token);
    mockQueryInterests.mockResolvedValue(interests);

    const { statusCode, body } = await call('GET /share/{token}', { token: 't1' });

    expect(statusCode).toBe(200);
    expect(body).toEqual(expect.objectContaining({ slug: 'ba2025', interests }));
  });
});

// ── My notes: /user/{slug}/notes ──────────────────────────────────────────────
//
// A note is private: it lives in a table of its own, which the share route
// never reads. Clearing a note is a PUT of an empty text, kept as a dated record
// so the clear wins the merge on the user's other devices.

describe('GET /user/{slug}/notes', () => {
  it('returns the caller\'s notes for the edition', async () => {
    const notes: DbUserNote[] = [
      { userId: 'user-1', slugArtistId: 'ba2025#42', text: 'Front left', updatedAt: 5 },
    ];
    mockQueryNotes.mockResolvedValue(notes);

    const { statusCode, body } = await call('GET /user/{slug}/notes', { slug: 'ba2025' }, { sub: 'user-1' });

    expect(statusCode).toBe(200);
    expect(mockQueryNotes).toHaveBeenCalledWith(undefined, 'user-1', 'ba2025');
    expect(body).toEqual(notes);
  });
});

describe('PUT /user/{slug}/notes/{artistId}', () => {
  const put = (text: unknown) => call(
    'PUT /user/{slug}/notes/{artistId}',
    { slug: 'ba2025', artistId: '42' },
    { body: JSON.stringify({ text }), sub: 'user-1' },
  );

  it('stores the text under the caller and the edition\'s artist, stamped by the server', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(1234);

    const { statusCode, body } = await put('Front left');

    expect(statusCode).toBe(200);
    expect(mockPutItem).toHaveBeenCalledWith(
      undefined, // table name from env, not set here
      { userId: 'user-1', slugArtistId: 'ba2025#42', text: 'Front left', updatedAt: 1234 },
    );
    expect(body).toEqual({ userId: 'user-1', slugArtistId: 'ba2025#42', text: 'Front left', updatedAt: 1234 });
    jest.restoreAllMocks();
  });

  it('stores an empty text as a dated clear, not a removal', async () => {
    const { statusCode } = await put('');

    expect(statusCode).toBe(200);
    expect(mockPutItem).toHaveBeenCalledWith(undefined, expect.objectContaining({ text: '' }));
  });

  it('accepts a text of exactly 1000 characters', async () => {
    const { statusCode } = await put('x'.repeat(1000));

    expect(statusCode).toBe(200);
  });

  it.each([
    ['1001 characters', 'x'.repeat(1001)],
    ['a number', 42],
    ['no text', undefined],
    ['null', null],
  ])('rejects %s', async (_label, text) => {
    const { statusCode } = await put(text);

    expect(statusCode).toBe(400);
    expect(mockPutItem).not.toHaveBeenCalled();
  });
});

describe('notes stay private', () => {
  it('a shared schedule never reads the notes', async () => {
    const token: DbShareToken = { token: 't1', userId: 'user-1', slug: 'ba2025', createdAt: 1, label: 'Friend' };
    mockGetItem.mockResolvedValue(token);
    mockQueryInterests.mockResolvedValue([]);

    const { body } = await call('GET /share/{token}', { token: 't1' });

    expect(mockQueryNotes).not.toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('text');
  });
});
