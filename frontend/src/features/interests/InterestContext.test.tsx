import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import {
  InterestProvider,
  nextStatus,
  useInterest,
  useDeferredInterests,
  useInterestCycle,
  useInterestStatus,
  type InterestStatus,
} from './InterestContext';
import { deleteUserInterest, fetchUserInterests, putUserInterest } from '../../adapters/baUserApiAdapter';
import { setInterest } from '../../cache/cacheService';
import { setCurrentTimeMs } from '../../utils/clock';
import { useAuth } from '../../auth/AuthContext';
import type { DbUserInterest } from '../../types/backend';

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

jest.mock('../../store/AppContext', () => ({
  useSelectedSlug: () => mockCurrentSlug,
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../adapters/baUserApiAdapter', () => ({
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
let choose: (artistId: string, status: InterestStatus) => void;
let refresh: () => Promise<void>;

function Probe({ artistId }: { artistId: string }) {
  const { getStatus } = useInterest();
  const { cycleStatus, setStatus, refreshFromServer } = useInterestCycle();
  press = (id) => { cycleStatus(id); };
  choose = (id, status) => { setStatus(id, status); };
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
  // Let the signed-in server merge on mount settle, so a case starts from rest.
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

// ── Starting state ────────────────────────────────────────────────────────────

describe('on mount', () => {
  it('shows the picks the startup gate loaded, on the very first render', async () => {
    signedIn(null);
    // What StartupGate's hydration leaves in memory before the providers mount.
    await setInterest(mockCurrentSlug, 'a1', 'will_go');

    // No flush: the pick must be there before any effect has run.
    await render(
      <InterestProvider>
        <Probe artistId="a1" />
      </InterestProvider>,
    );

    expect(screen.getByText('will_go')).toBeTruthy();
  });
});

// ── The cycle ─────────────────────────────────────────────────────────────────

describe('nextStatus', () => {
  it('cycles none → maybe → will_go → dont_go → none', () => {
    expect(nextStatus('none')).toBe('maybe');
    expect(nextStatus('maybe')).toBe('will_go');
    expect(nextStatus('will_go')).toBe('dont_go');
    expect(nextStatus('dont_go')).toBe('none');
  });
});

describe('pressing the star', () => {
  it('advances the status shown', async () => {
    await mount();
    expect(screen.getByText('none')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('maybe')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('will_go')).toBeTruthy();

    await act(async () => { press('a1'); await flush(); });
    expect(screen.getByText('dont_go')).toBeTruthy();

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
    await act(async () => { press('a1'); await flush(); });   // will_go
    await act(async () => { press('a1'); await flush(); });   // dont_go
    await act(async () => { press('a1'); await flush(); });   // none

    // 'none' has no server representation — leaving a stale row would resurrect
    // the pick on the next merge.
    expect(mockDelete).toHaveBeenCalledWith(mockCurrentSlug, 'a1', FAKE_TOKEN);
  });

  it('puts dont_go like any other decision, deleting only on none', async () => {
    await mount();
    await act(async () => { press('a1'); await flush(); });   // maybe
    await act(async () => { press('a1'); await flush(); });   // will_go
    await act(async () => { press('a1'); await flush(); });   // dont_go

    // It is a stored decision, not an absence: other devices and the share data
    // must see it.
    expect(mockPut).toHaveBeenLastCalledWith(mockCurrentSlug, 'a1', 'dont_go', FAKE_TOKEN);
    expect(mockDelete).not.toHaveBeenCalled();
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

// ── Choosing a state in the star selector ─────────────────────────────────────

describe('choosing a state directly', () => {
  it('jumps to it, skipping the states between', async () => {
    await mount();

    await act(async () => { choose('a1', 'dont_go'); await flush(); });

    expect(screen.getByText('dont_go')).toBeTruthy();
  });

  it('pushes the chosen state to the server', async () => {
    await mount();

    await act(async () => { choose('a1', 'will_go'); await flush(); });

    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'will_go', FAKE_TOKEN);
  });

  it('deletes rather than putting when "Not marked" is chosen', async () => {
    await mount();
    await act(async () => { choose('a1', 'maybe'); await flush(); });

    await act(async () => { choose('a1', 'none'); await flush(); });

    expect(screen.getByText('none')).toBeTruthy();
    expect(mockDelete).toHaveBeenCalledWith(mockCurrentSlug, 'a1', FAKE_TOKEN);
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

    expect(screen.getByText('will_go')).toBeTruthy();
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
    expect(screen.getByText('will_go')).toBeTruthy();
  });

  it('does nothing at all when signed out', async () => {
    signedIn(null);
    await mount();

    await act(async () => { await refresh(); });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

// ── One artist's status ───────────────────────────────────────────────────────
//
// What a row reads: its own artist's pick, and a render only when that changes.

describe("one artist's status", () => {
  const statusRenders: Record<string, number> = {};

  function StatusProbe({ artistId }: { artistId: string }) {
    const status = useInterestStatus(artistId);
    statusRenders[artistId] = (statusRenders[artistId] ?? 0) + 1;
    return <Text testID={`status-${artistId}`}>{status}</Text>;
  }

  async function mountStatuses(...artistIds: string[]) {
    await render(
      <InterestProvider>
        <Probe artistId="unused" />
        {artistIds.map((id) => <StatusProbe key={id} artistId={id} />)}
      </InterestProvider>,
    );
    await act(async () => { await flush(); });
    for (const id of Object.keys(statusRenders)) { delete statusRenders[id]; }
  }

  const shownFor = (artistId: string) => screen.getByTestId(`status-${artistId}`).props.children;

  it('shows the pick the startup gate loaded', async () => {
    signedIn(null);
    await setInterest(mockCurrentSlug, 'a1', 'will_go');
    await mountStatuses('a1');
    expect(shownFor('a1')).toBe('will_go');
  });

  it('follows a press, a direct choice and a pick from another device', async () => {
    await mountStatuses('a1');

    await act(async () => { press('a1'); await flush(); });
    expect(shownFor('a1')).toBe('maybe');

    await act(async () => { choose('a1', 'dont_go'); await flush(); });
    expect(shownFor('a1')).toBe('dont_go');

    mockFetch.mockResolvedValue([
      { userId: 'u1', slugArtistId: `${mockCurrentSlug}#a1`, status: 'will_go', updatedAt: NOW + 1 },
    ]);
    await act(async () => { await refresh(); await flush(); });
    expect(shownFor('a1')).toBe('will_go');
  });

  it("renders only for its own artist's change", async () => {
    await mountStatuses('a1', 'a2');

    await act(async () => { press('a1'); await flush(); });

    expect(statusRenders).toEqual({ a1: 1 });
    expect(shownFor('a2')).toBe('none');
  });

  it('a press reads the pick at call time, without subscribing', async () => {
    let getStatus: (artistId: string) => InterestStatus = () => 'none';
    function Reader() {
      getStatus = useInterestCycle().getStatus;
      return null;
    }
    await render(<InterestProvider><Probe artistId="a1" /><Reader /></InterestProvider>);
    await act(async () => { await flush(); });

    await act(async () => { press('a1'); await flush(); });

    expect(getStatus('a1')).toBe('maybe');
  });
});

describe('the deferred picks', () => {
  const seen: Record<string, Record<string, InterestStatus>> = {};

  function DeferredProbe({ name }: { name: string }) {
    const picks = useDeferredInterests();
    seen[name] = picks;
    return <Text testID={`deferred-${name}`}>{picks.a1 ?? 'none'}</Text>;
  }

  async function mountDeferred() {
    await render(
      <InterestProvider>
        <Probe artistId="a1" />
        <DeferredProbe name="first" />
        <DeferredProbe name="second" />
      </InterestProvider>,
    );
    await act(async () => { await flush(); });
  }

  const deferredA1 = () => screen.getByTestId('deferred-first').props.children;

  it('follow a press, a direct choice and a pick from another device', async () => {
    await mountDeferred();

    await act(async () => { press('a1'); await flush(); });
    expect(deferredA1()).toBe('maybe');

    await act(async () => { choose('a1', 'dont_go'); await flush(); });
    expect(deferredA1()).toBe('dont_go');

    mockFetch.mockResolvedValue([
      { userId: 'u1', slugArtistId: `${mockCurrentSlug}#a1`, status: 'will_go', updatedAt: NOW + 1 },
    ]);
    await act(async () => { await refresh(); await flush(); });
    expect(deferredA1()).toBe('will_go');
  });

  it('are one value: every reader gets the same object', async () => {
    await mountDeferred();

    await act(async () => { press('a1'); await flush(); });

    expect(seen.first.a1).toBe('maybe');
    expect(seen.second).toBe(seen.first);
  });
});
