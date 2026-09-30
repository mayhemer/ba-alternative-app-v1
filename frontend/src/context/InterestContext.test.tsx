import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  InterestProvider,
  nextStatus,
  useInterest,
  useInterestCycle,
} from './InterestContext';
import { deleteUserInterest, fetchUserInterests, putUserInterest } from '../adapters/baUserApiAdapter';
import { setCurrentTimeMs } from '../utils/clock';
import { useAuth } from './AuthContext';
import type { DbUserInterest } from '../types/backend';

// ── Jest mocks ────────────────────────────────────────────────────────────────
// Boundaries only: the slug source, the session, and the user API. Everything
// below them — the reducer, the cache, the merge — runs for real, so these cases
// cover the actual wiring rather than a rehearsal of it.
//
// The access token is a plain fake string on purpose: nothing client-side parses
// it, the adapter only puts it in an Authorization header, and Cognito's
// validation is server-side and not this app's contract.

// Each case gets an edition of its own: interests are module state keyed by
// slug, so a shared one lets picks (and their timestamps) leak between cases.
//
// The `mock` prefix is load-bearing. jest.mock factories are hoisted above this
// declaration and may not close over ordinary outer variables — Jest allows the
// reference only for names beginning with "mock".
let mockCurrentSlug = 'ba2025';

jest.mock('../store/AppContext', () => ({
  useSelectedSlug: () => mockCurrentSlug,
}));

jest.mock('./AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../adapters/baUserApiAdapter', () => ({
  fetchUserInterests: jest.fn(),
  putUserInterest: jest.fn(),
  deleteUserInterest: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetch = fetchUserInterests as jest.MockedFunction<typeof fetchUserInterests>;
const mockPut = putUserInterest as jest.MockedFunction<typeof putUserInterest>;
const mockDelete = deleteUserInterest as jest.MockedFunction<typeof deleteUserInterest>;

const FAKE_TOKEN = 'fake.access.token';
const NOW = Date.parse('2026-08-05T11:00:00+02:00');
const EARLIER = Date.parse('2026-08-05T10:00:00+02:00');

function signedIn(token: string | null = FAKE_TOKEN) {
  mockUseAuth.mockReturnValue({
    isLoggedIn: token !== null,
    getAccessToken: jest.fn(async () => token),
  } as unknown as ReturnType<typeof useAuth>);
}

// Renders the status it reads and exposes the cycle, so a case can press the
// star the way the UI does.
let press: (artistId: string) => void;
let refresh: () => Promise<void>;

function Probe({ artistId }: { artistId: string }) {
  const { getStatus } = useInterest();
  const { cycleStatus, refreshFromServer } = useInterestCycle();
  press = (id) => { cycleStatus(id); };
  refresh = refreshFromServer;
  return <Text>{getStatus(artistId)}</Text>;
}

const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

async function mount(artistId = 'a1') {
  await render(
    <InterestProvider>
      <Probe artistId={artistId} />
    </InterestProvider>,
  );
  // The provider hydrates from storage in an effect, and dispatches the result.
  // Waiting for it matters: a press landing first is overwritten when HYDRATE
  // arrives, which looks exactly like the press being ignored.
  await act(async () => { await flush(); });
}

let slugCounter = 0;

beforeEach(() => {
  mockCurrentSlug = `interestctx${++slugCounter}`;
  signedIn();
  mockFetch.mockResolvedValue([]);
  mockPut.mockResolvedValue(undefined as never);
  mockDelete.mockResolvedValue(undefined as never);
  setCurrentTimeMs(NOW);
});

// ── The cycle ─────────────────────────────────────────────────────────────────

describe('nextStatus', () => {
  it('cycles none → maybe → must_see → none', () => {
    expect(nextStatus('none')).toBe('maybe');
    expect(nextStatus('maybe')).toBe('must_see');
    expect(nextStatus('must_see')).toBe('none');
  });
});

describe('pressing the star', () => {
  it('advances the status shown', async () => {
    await mount();
    expect(screen.getByText('none')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('maybe')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('must_see')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('none')).toBeTruthy();
  });

  it('pushes a star to the server as will_go', async () => {
    await mount();

    await act(async () => { press('a1'); await flush(); });
    await act(async () => { press('a1'); await flush(); });

    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'will_go', FAKE_TOKEN);
  });

  it('deletes rather than putting when the star is cleared', async () => {
    await mount();
    await act(async () => { press('a1'); await flush(); });   // maybe
    await act(async () => { press('a1'); await flush(); });   // must_see
    await act(async () => { press('a1'); await flush(); });   // none

    // 'none' has no server representation — leaving a stale row would resurrect
    // the pick on the next merge.
    expect(mockDelete).toHaveBeenCalledWith(mockCurrentSlug, 'a1', FAKE_TOKEN);
  });

  it('still records the pick locally when signed out', async () => {
    signedIn(null);
    await mount();

    await act(async () => { press('a1'); await flush(); });

    expect(screen.getByText('maybe')).toBeTruthy();
    expect(mockPut).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('keeps the local pick when the server rejects it', async () => {
    mockPut.mockRejectedValue(new Error('500'));
    await mount();

    await act(async () => { press('a1'); await flush(); });

    // Swallowed on purpose: the next merge reconciles by updatedAt, and a lost
    // star would be worse than a late one.
    expect(screen.getByText('maybe')).toBeTruthy();
  });
});

// ── Refresh from the server ───────────────────────────────────────────────────

describe('refreshing from the server', () => {
  function serverEntry(artistId: string, status: DbUserInterest['status'], updatedAt: number): DbUserInterest {
    return { userId: 'u1', slugArtistId: `${mockCurrentSlug}#${artistId}`, status, updatedAt };
  }

  it('adopts a pick made on another device', async () => {
    await mount('remote');
    mockFetch.mockResolvedValue([serverEntry('remote', 'will_go', NOW)]);

    await act(async () => { await refresh(); });

    expect(screen.getByText('must_see')).toBeTruthy();
  });

  it('pushes back a local pick the server has not seen', async () => {
    await mount();
    await act(async () => { press('a1'); await flush(); });
    mockPut.mockClear();

    mockFetch.mockResolvedValue([]);
    await act(async () => { await refresh(); await flush(); });

    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'maybe', FAKE_TOKEN);
  });

  it('does not push back when the server copy is newer', async () => {
    setCurrentTimeMs(EARLIER);
    await mount();
    await act(async () => { press('a1'); await flush(); });
    mockPut.mockClear();

    mockFetch.mockResolvedValue([serverEntry('a1', 'will_go', NOW)]);
    await act(async () => { await refresh(); await flush(); });

    expect(mockPut).not.toHaveBeenCalled();
    expect(screen.getByText('must_see')).toBeTruthy();
  });

  it('does nothing at all when signed out', async () => {
    signedIn(null);
    await mount();

    await act(async () => { await refresh(); });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
