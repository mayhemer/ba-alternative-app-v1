import type { ScheduledEvent } from 'aws-lambda';

// ── Jest mocks — must appear before importing the module under test ────────────

jest.mock('./official-api', () => ({
  fetchChanges: jest.fn(),
  fetchArtists: jest.fn(),
  fetchSchedule: jest.fn(),
}));

jest.mock('./db', () => ({
  getSyncState: jest.fn(),
  putSyncState: jest.fn(),
  queryAllKeys: jest.fn(),
  batchPut: jest.fn(),
  batchDelete: jest.fn(),
}));

jest.mock('./cloudfront', () => ({
  invalidatePaths: jest.fn(),
}));

import { handler } from './handler';
import { fetchChanges, fetchArtists, fetchSchedule } from './official-api';
import { getSyncState, putSyncState, queryAllKeys, batchPut, batchDelete } from './db';
import { invalidatePaths } from './cloudfront';
import type { DbSyncState } from '../../shared/types';

const mockFetchChanges  = fetchChanges  as jest.MockedFunction<typeof fetchChanges>;
const mockFetchArtists  = fetchArtists  as jest.MockedFunction<typeof fetchArtists>;
const mockFetchSchedule = fetchSchedule as jest.MockedFunction<typeof fetchSchedule>;
const mockGetSyncState   = getSyncState   as jest.MockedFunction<typeof getSyncState>;
const mockPutSyncState   = putSyncState   as jest.MockedFunction<typeof putSyncState>;
const mockQueryAllKeys   = queryAllKeys   as jest.MockedFunction<typeof queryAllKeys>;
const mockBatchPut       = batchPut       as jest.MockedFunction<typeof batchPut>;
const mockBatchDelete    = batchDelete    as jest.MockedFunction<typeof batchDelete>;
const mockInvalidatePaths = invalidatePaths as jest.MockedFunction<typeof invalidatePaths>;

// ── Fixture data ──────────────────────────────────────────────────────────────

const ARTIST_TIME   = 1_000_000;
const SCHEDULE_TIME = 2_000_000;

const CHANGES = [
  { id: 1, table: 'db_artist',                     time: ARTIST_TIME,   count: 1 },
  { id: 2, table: 'db_artist_localized',            time: ARTIST_TIME,   count: 1 },
  { id: 3, table: 'db_schedule',                    time: SCHEDULE_TIME, count: 1 },
  { id: 4, table: 'db_schedule_category',           time: SCHEDULE_TIME, count: 1 },
  { id: 5, table: 'db_schedule_category_localized', time: SCHEDULE_TIME, count: 1 },
  { id: 6, table: 'db_stage',                       time: SCHEDULE_TIME, count: 1 },
  { id: 7, table: 'db_stage_localized',             time: SCHEDULE_TIME, count: 1 },
];

const ARTIST_1 = {
  id: 1, name: 'Band A', url: 'https://band.com', facebook_url: '',
  youtube_url: '', image_url: 'img.jpg', thumb_url: 'thumb.jpg',
  is_playable: true, localized: [],
};

const SCHEDULE = {
  schedules: [{
    id: 1, date_from: 1_000_000, date_to: 2_000_000,
    stage_id: 1, artist_id: 1, schedule_category_id: 1,
    stage:  { id: 1, image_url: '', thumb_url: '', localized: [] },
    artist: ARTIST_1,
  }],
  categories: [{ id: 1, color: 0xff0000, localized: [] }],
};

// ── Env helpers ───────────────────────────────────────────────────────────────

const BASE_ENV = {
  FESTIVAL_SLUGS:              'ba2025',
  ARTISTS_TABLE:               'ba-artists',
  STAGES_TABLE:                'ba-stages',
  CATEGORIES_TABLE:            'ba-categories',
  EVENTS_TABLE:                'ba-events',
  SYNC_STATE_TABLE:            'ba-sync-state',
  CLOUDFRONT_DISTRIBUTION_ID:  'DIST123',
};

function setEnv(overrides: Partial<typeof BASE_ENV> = {}): void {
  Object.assign(process.env, { ...BASE_ENV, ...overrides });
}

function clearEnv(): void {
  for (const key of Object.keys(BASE_ENV)) delete process.env[key];
}

function syncState(tableName: string, time: number): DbSyncState {
  return { slug: 'ba2025', tableName, lastOfficialUpdate: time, lastSyncedAt: time, dataVersion: '' };
}

// ── Default mock behaviour ────────────────────────────────────────────────────

beforeEach(() => {
  mockFetchChanges.mockResolvedValue(CHANGES);
  mockFetchArtists.mockResolvedValue([ARTIST_1]);
  mockFetchSchedule.mockResolvedValue(SCHEDULE);

  mockGetSyncState.mockResolvedValue(new Map());   // no prior sync → both dirty
  mockQueryAllKeys.mockResolvedValue([]);           // empty DB
  mockBatchPut.mockResolvedValue(undefined);
  mockBatchDelete.mockResolvedValue(undefined);
  mockPutSyncState.mockResolvedValue(undefined);
  mockInvalidatePaths.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
  clearEnv();
});

const EVENT = {} as ScheduledEvent;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('no slugs configured', () => {
  it('returns without any API or DB calls', async () => {
    setEnv({ FESTIVAL_SLUGS: '' });
    await handler(EVENT);
    expect(mockFetchChanges).not.toHaveBeenCalled();
    expect(mockGetSyncState).not.toHaveBeenCalled();
    expect(mockBatchPut).not.toHaveBeenCalled();
  });
});

describe('clean — nothing to sync', () => {
  it('skips rebuild when official timestamps match last-synced', async () => {
    setEnv();
    mockGetSyncState.mockResolvedValue(new Map([
      ['artists',  syncState('artists',  ARTIST_TIME)],
      ['schedule', syncState('schedule', SCHEDULE_TIME)],
    ]));
    await handler(EVENT);
    expect(mockFetchArtists).not.toHaveBeenCalled();
    expect(mockFetchSchedule).not.toHaveBeenCalled();
    expect(mockBatchPut).not.toHaveBeenCalled();
    expect(mockInvalidatePaths).not.toHaveBeenCalled();
  });
});

describe('both dirty', () => {
  it('calls batchPut for all four tables (artists + stages + categories + events)', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockBatchPut).toHaveBeenCalledTimes(4);
    const tables = mockBatchPut.mock.calls.map(c => c[0]).sort();
    expect(tables).toEqual(['ba-artists', 'ba-categories', 'ba-events', 'ba-stages'].sort());
  });

  it('writes two sync-state records', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockPutSyncState).toHaveBeenCalledTimes(2);
    const records = mockPutSyncState.mock.calls.map(c => c[1]);
    expect(records.find(r => r.tableName === 'artists')?.lastOfficialUpdate).toBe(ARTIST_TIME);
    expect(records.find(r => r.tableName === 'schedule')?.lastOfficialUpdate).toBe(SCHEDULE_TIME);
  });

  it('invalidates all four CloudFront paths', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockInvalidatePaths).toHaveBeenCalledTimes(1);
    const [distId, paths] = mockInvalidatePaths.mock.calls[0];
    expect(distId).toBe('DIST123');
    expect(paths).toEqual(expect.arrayContaining([
      '/ba2025/artists',
      '/ba2025/schedule',
      '/ba2025/categories',
      '/ba2025/stages',
    ]));
  });
});

describe('only artists dirty', () => {
  beforeEach(() => {
    mockGetSyncState.mockResolvedValue(new Map([
      ['schedule', syncState('schedule', SCHEDULE_TIME)],
    ]));
  });

  it('fetches artists but not schedule', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockFetchArtists).toHaveBeenCalled();
    expect(mockFetchSchedule).not.toHaveBeenCalled();
  });

  it('calls batchPut only for the artists table', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockBatchPut).toHaveBeenCalledTimes(1);
    expect(mockBatchPut.mock.calls[0][0]).toBe('ba-artists');
  });

  it('invalidates only the artists path', async () => {
    setEnv();
    await handler(EVENT);
    const [, paths] = mockInvalidatePaths.mock.calls[0];
    expect(paths).toEqual(['/ba2025/artists']);
  });
});

describe('only schedule dirty', () => {
  beforeEach(() => {
    mockGetSyncState.mockResolvedValue(new Map([
      ['artists', syncState('artists', ARTIST_TIME)],
    ]));
  });

  it('fetches schedule but not artists', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockFetchSchedule).toHaveBeenCalled();
    expect(mockFetchArtists).not.toHaveBeenCalled();
  });

  it('calls batchPut for stages, categories, and events — not artists', async () => {
    setEnv();
    await handler(EVENT);
    expect(mockBatchPut).toHaveBeenCalledTimes(3);
    const tables = mockBatchPut.mock.calls.map(c => c[0]);
    expect(tables).not.toContain('ba-artists');
    expect(tables).toContain('ba-stages');
    expect(tables).toContain('ba-categories');
    expect(tables).toContain('ba-events');
  });

  it('invalidates schedule paths but not artists', async () => {
    setEnv();
    await handler(EVENT);
    const [, paths] = mockInvalidatePaths.mock.calls[0];
    expect(paths).not.toContain('/ba2025/artists');
    expect(paths).toEqual(expect.arrayContaining([
      '/ba2025/schedule',
      '/ba2025/categories',
      '/ba2025/stages',
    ]));
  });
});

describe('stale item deletion', () => {
  it('deletes artists absent from new data', async () => {
    setEnv();
    mockQueryAllKeys.mockImplementation((table) =>
      table === 'ba-artists'
        ? Promise.resolve([{ slug: 'ba2025', artistId: '9999' }])
        : Promise.resolve([]),
    );
    await handler(EVENT);
    expect(mockBatchDelete).toHaveBeenCalledWith(
      'ba-artists',
      [{ slug: 'ba2025', artistId: '9999' }],
    );
  });

  it('does not delete artists still present in new data', async () => {
    setEnv();
    // artistId '1' matches ARTIST_1.id
    mockQueryAllKeys.mockImplementation((table) =>
      table === 'ba-artists'
        ? Promise.resolve([{ slug: 'ba2025', artistId: '1' }])
        : Promise.resolve([]),
    );
    await handler(EVENT);
    const artistDeletes = mockBatchDelete.mock.calls.filter(c => c[0] === 'ba-artists');
    expect(artistDeletes).toHaveLength(0);
  });
});

describe('no CloudFront distribution configured', () => {
  it('skips invalidation when CLOUDFRONT_DISTRIBUTION_ID is empty', async () => {
    setEnv({ CLOUDFRONT_DISTRIBUTION_ID: '' });
    await handler(EVENT);
    expect(mockInvalidatePaths).not.toHaveBeenCalled();
  });
});

describe('per-slug error isolation', () => {
  it('continues to the second slug when the first throws', async () => {
    setEnv({ FESTIVAL_SLUGS: 'bad-slug,ba2025' });
    mockGetSyncState
      .mockRejectedValueOnce(new Error('DB error for bad-slug'))
      .mockResolvedValueOnce(new Map());
    await expect(handler(EVENT)).resolves.toBeUndefined();
    expect(mockGetSyncState).toHaveBeenCalledTimes(2);
  });
});

describe('multiple slugs', () => {
  it('runs a full rebuild for each slug independently', async () => {
    setEnv({ FESTIVAL_SLUGS: 'ba2025,ba2024' });
    await handler(EVENT);
    expect(mockBatchPut).toHaveBeenCalledTimes(8); // 4 tables × 2 slugs
  });

  it('writes sync-state records for each slug', async () => {
    setEnv({ FESTIVAL_SLUGS: 'ba2025,ba2024' });
    await handler(EVENT);
    expect(mockPutSyncState).toHaveBeenCalledTimes(4); // artists + schedule × 2 slugs
    const slugs = mockPutSyncState.mock.calls.map(c => c[1].slug);
    expect(slugs.filter(s => s === 'ba2025')).toHaveLength(2);
    expect(slugs.filter(s => s === 'ba2024')).toHaveLength(2);
  });
});
