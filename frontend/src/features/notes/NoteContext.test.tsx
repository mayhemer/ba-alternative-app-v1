import React from 'react';
import { Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import { NoteProvider, useNoteActions, useNoteText } from './NoteContext';
import { fetchUserNotes, putUserNote } from '../../adapters/baUserApiAdapter';
import { getLocalNotes, hydrateNotes, setNote } from '../../cache/notesCache';
import { setCurrentTimeMs } from '../../utils/clock';
import { useAuth } from '../../auth/AuthContext';
import type { DbUserNote } from '../../types/backend';

// ── My notes, synced like the picks ───────────────────────────────────────────
//
// Boundaries only are mocked: the slug, the session and the user API. The
// store, the local cache and the merge run for real.
//
// Dimensions: signed in or out (and signing in later); the server's copy
// (none, older, the same time, newer, a clear); a save (text, a clear, a draft
// kept on the device only).

let mockCurrentSlug = 'ba2025';

jest.mock('../../store/AppContext', () => ({
  useSelectedSlug: () => mockCurrentSlug,
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../adapters/baUserApiAdapter', () => ({
  fetchUserNotes: jest.fn(),
  putUserNote: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockFetch = fetchUserNotes as jest.MockedFunction<typeof fetchUserNotes>;
const mockPut = putUserNote as jest.MockedFunction<typeof putUserNote>;

const FAKE_TOKEN = 'fake.access.token';
const NOW = Date.parse('2026-08-05T11:00:00+02:00');
const EARLIER = Date.parse('2026-08-05T10:00:00+02:00');

function signedIn(token: string | null = FAKE_TOKEN) {
  mockUseAuth.mockReturnValue({
    isLoggedIn: token !== null,
    getAccessToken: jest.fn(async () => token),
  } as unknown as ReturnType<typeof useAuth>);
}

function serverNote(artistId: string, text: string, updatedAt: number): DbUserNote {
  return { userId: 'u1', slugArtistId: `${mockCurrentSlug}#${artistId}`, text, updatedAt };
}

// Each reader counts its own renders, so a case can tell which one a save reached.
const renders: Record<string, number> = {};
let actions: ReturnType<typeof useNoteActions>;

function Reader({ artistId }: { artistId: string }) {
  renders[artistId] = (renders[artistId] ?? 0) + 1;
  const text = useNoteText(artistId);
  return <Text testID={`note-${artistId}`}>{text === '' ? '(none)' : text}</Text>;
}

function Actions() {
  actions = useNoteActions();
  return null;
}

const flush = (): Promise<void> => new Promise((r) => { setTimeout(r, 0); });

function tree() {
  return (
    <NoteProvider>
      <Actions />
      <Reader artistId="a1" />
      <Reader artistId="a2" />
    </NoteProvider>
  );
}

async function mount() {
  await render(tree());
  await act(async () => { await flush(); });
}

const shown = (artistId: string): string => String(screen.getByTestId(`note-${artistId}`).props.children);

let slugCounter = 0;

beforeEach(async () => {
  mockCurrentSlug = `notectx${++slugCounter}`;
  await hydrateNotes(mockCurrentSlug);
  signedIn();
  mockFetch.mockResolvedValue([]);
  mockPut.mockResolvedValue(undefined);
  setCurrentTimeMs(NOW);
  for (const key of Object.keys(renders)) { delete renders[key]; }
});

// ── Starting state ────────────────────────────────────────────────────────────

describe('on mount', () => {
  it('shows the notes the startup gate loaded, on the very first render', async () => {
    signedIn(null);
    await setNote(mockCurrentSlug, 'a1', 'Front left');

    await render(tree());

    expect(shown('a1')).toBe('Front left');
    expect(shown('a2')).toBe('(none)');
  });

  it('shows a cleared note as none', async () => {
    signedIn(null);
    await setNote(mockCurrentSlug, 'a1', '');

    await render(tree());

    expect(shown('a1')).toBe('(none)');
  });
});

// ── Merging the server's copy ─────────────────────────────────────────────────

describe('signed in, at mount', () => {
  it('adopts a newer note from the server', async () => {
    setCurrentTimeMs(EARLIER);
    await setNote(mockCurrentSlug, 'a1', 'old');
    mockFetch.mockResolvedValue([serverNote('a1', 'from the other phone', NOW)]);

    await mount();

    expect(mockFetch).toHaveBeenCalledWith(mockCurrentSlug, FAKE_TOKEN);
    expect(shown('a1')).toBe('from the other phone');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('pushes a local note the server has never seen', async () => {
    await setNote(mockCurrentSlug, 'a1', 'written signed out');

    await mount();

    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'written signed out', FAKE_TOKEN);
  });

  it('pushes a local note newer than the server\'s', async () => {
    await setNote(mockCurrentSlug, 'a1', 'new');
    mockFetch.mockResolvedValue([serverNote('a1', 'old', EARLIER)]);

    await mount();

    expect(shown('a1')).toBe('new');
    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'new', FAKE_TOKEN);
  });

  it('pushes a newer local clear as an empty text', async () => {
    await setNote(mockCurrentSlug, 'a1', '');
    mockFetch.mockResolvedValue([serverNote('a1', 'old', EARLIER)]);

    await mount();

    expect(shown('a1')).toBe('(none)');
    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', '', FAKE_TOKEN);
  });

  it('does not push a cleared note the server never had', async () => {
    await setNote(mockCurrentSlug, 'a1', '');

    await mount();

    expect(mockPut).not.toHaveBeenCalled();
  });

  it('pushes nothing when the server has the same note at the same time', async () => {
    await setNote(mockCurrentSlug, 'a1', 'same');
    mockFetch.mockResolvedValue([serverNote('a1', 'same', NOW)]);

    await mount();

    expect(mockPut).not.toHaveBeenCalled();
  });
});

describe('signed out', () => {
  it('never asks the server', async () => {
    signedIn(null);

    await mount();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('merges when the user signs in later', async () => {
    signedIn(null);
    const view = await render(tree());
    await act(async () => { await flush(); });
    mockFetch.mockResolvedValue([serverNote('a1', 'from the server', NOW)]);

    signedIn();
    await view.rerender(tree());
    await act(async () => { await flush(); });

    expect(shown('a1')).toBe('from the server');
  });
});

// ── Saving ────────────────────────────────────────────────────────────────────

describe('saving a note', () => {
  it('shows it at once, keeps it on the device and sends it to the server', async () => {
    await mount();

    await act(async () => { await actions.saveNote('a1', 'Front left'); });

    expect(shown('a1')).toBe('Front left');
    expect(getLocalNotes(mockCurrentSlug).a1).toEqual({ text: 'Front left', updatedAt: NOW });
    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', 'Front left', FAKE_TOKEN);
  });

  it('sends a clear as an empty text', async () => {
    await setNote(mockCurrentSlug, 'a1', 'old');
    mockFetch.mockResolvedValue([serverNote('a1', 'old', NOW + 1)]);
    await mount();

    await act(async () => { await actions.saveNote('a1', ''); });

    expect(shown('a1')).toBe('(none)');
    expect(mockPut).toHaveBeenCalledWith(mockCurrentSlug, 'a1', '', FAKE_TOKEN);
  });

  it('keeps it on the device only when signed out', async () => {
    signedIn(null);
    await mount();

    await act(async () => { await actions.saveNote('a1', 'Front left'); });

    expect(getLocalNotes(mockCurrentSlug).a1.text).toBe('Front left');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('keeps it on the device when the server cannot be reached', async () => {
    mockPut.mockRejectedValue(new Error('offline'));
    await mount();

    await act(async () => { await actions.saveNote('a1', 'Front left'); });

    expect(shown('a1')).toBe('Front left');
    expect(getLocalNotes(mockCurrentSlug).a1.text).toBe('Front left');
  });

  it('a draft is kept on the device without being sent', async () => {
    await mount();

    await act(async () => { await actions.saveDraft('a1', 'Front le'); });

    expect(getLocalNotes(mockCurrentSlug).a1.text).toBe('Front le');
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('renders the note of that artist only', async () => {
    await mount();
    const before = { ...renders };

    await act(async () => { await actions.saveNote('a1', 'Front left'); });

    expect(renders.a1).toBe(before.a1 + 1);
    expect(renders.a2).toBe(before.a2);
  });
});
