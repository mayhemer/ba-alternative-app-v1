import React from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { ArtistDetailSheet } from './ArtistDetailSheet';
import { PerfProviders } from '../../../tests/setup/PerfProviders';
import { useArtistDetail } from './ArtistDetailContext';
import { useInterestCycle } from '../interests/InterestContext';
import { createDataCollector, hydrateInterests, populateCache, setInterest } from '../../cache/cacheService';
import { rendersSinceReset, resetRenders } from '../../../tests/setup/countRenders';
import type { DbArtist, DbCategory, DbEvent, DbStage } from '../../types/backend';
import { putArtistBios } from '../../cache/cacheService';
import { setLanguageChoice } from '../../i18n/language';
import { getLocalNotes, hydrateNotes, setNote } from '../../cache/notesCache';

// ── The artist sheet reacts to every input ────────────────────────────────────
//
// A small edition of its own (each test file has its own cache): BASTION plays
// Wednesday 13:00–14:00, Thursday 13:00–14:00 and Wednesday night 00:35–01:30;
// RIVAL plays Wednesday 13:30–14:30, over BASTION's first set. The inputs: my
// picks (BASTION's, RIVAL's) and a sync that moves RIVAL away. Then the render
// counts: which of the sheet's elements render again after one change — the
// title row by the artistId, each set row by its eventId.

jest.mock('@gorhom/bottom-sheet', () => ({ __esModule: true, ...require('@gorhom/bottom-sheet/mock') }));

jest.mock('../../store/AppContext', () => {
  const actual = jest.requireActual('../../store/AppContext');
  return { ...actual, useSelectedSlug: () => 'sheettest' };
});

// One auth value for the whole run, as the real provider memoises its own.
jest.mock('../../auth/AuthContext', () => {
  const auth = {
    isLoggedIn: false,
    isRestoringSession: false,
    userId: null,
    email: null,
    name: null,
    getAccessToken: async () => null,
    signIn: async () => undefined,
    signOut: async () => undefined,
  };
  return { useAuth: () => auth };
});

jest.mock('./ArtistDetailTitle', () => {
  const { counted } = require('../../../tests/setup/countRenders');
  const actual = jest.requireActual('./ArtistDetailTitle');
  return { ...actual, ArtistDetailTitle: counted(actual.ArtistDetailTitle) };
});
// The sheet's two parts, counted by name: the sticky header (title row, star)
// and the scrolling body (links, hero, set rows, bio).
const mockPartRenders: Record<string, number> = {};
jest.mock('./ArtistDetailScreen', () => {
  const actual = jest.requireActual('./ArtistDetailScreen');
  const countedPart = (name: string, part: (props: unknown) => unknown) => (props: unknown) => {
    mockPartRenders[name] = (mockPartRenders[name] ?? 0) + 1;
    return part(props);
  };
  return {
    ...actual,
    ArtistDetailHeader: countedPart('header', actual.ArtistDetailHeader),
    ArtistDetailBody: countedPart('body', actual.ArtistDetailBody),
  };
});
const resetPartRenders = (): void => {
  for (const name of Object.keys(mockPartRenders)) { delete mockPartRenders[name]; }
};

jest.mock('./ArtistSetRow', () => {
  const { counted } = require('../../../tests/setup/countRenders');
  const actual = jest.requireActual('./ArtistSetRow');
  return { ...actual, ArtistSetRow: counted(actual.ArtistSetRow) };
});

const SLUG = 'sheettest';
const at = (iso: string): number => Date.parse(iso);

function artist(artistId: string, name: string): DbArtist {
  return { slug: SLUG, artistId, name, isPlayable: true, imageUrl: '', thumbUrl: '', url: '', localized: [] };
}
function set(eventId: string, artistId: string, from: string, to: string): DbEvent {
  return { slug: SLUG, eventId, artistId, stageId: 's1', categoryId: 'c1', dateFrom: at(from), dateTo: at(to) };
}

const BASTION = artist('bastion', 'BASTION');
const RIVAL = artist('rival', 'RIVAL');
const EVENTS = [
  set('e-wed', 'bastion', '2025-08-06T13:00:00+02:00', '2025-08-06T14:00:00+02:00'),
  set('e-thu', 'bastion', '2025-08-07T13:00:00+02:00', '2025-08-07T14:00:00+02:00'),
  set('e-night', 'bastion', '2025-08-07T00:35:00+02:00', '2025-08-07T01:30:00+02:00'),
  set('e-rival', 'rival', '2025-08-06T13:30:00+02:00', '2025-08-06T14:30:00+02:00'),
];

function sync(events: DbEvent[]): void {
  const collector = createDataCollector();
  collector.setArtists([BASTION, RIVAL]);
  collector.setCategories([{ slug: SLUG, categoryId: 'c1', color: 0, localized: [] } as unknown as DbCategory]);
  collector.setStages([{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] } as unknown as DbStage]);
  collector.setEvents(events);
  populateCache(SLUG, collector.build(), at('2025-08-06T09:00:00+02:00'));
}

let openDetail: (artist: DbArtist) => void;
let closeDetail: () => void;
let cycle: (artistId: string) => void;

function Controls() {
  const detail = useArtistDetail();
  const { cycleStatus } = useInterestCycle();
  openDetail = (a) => { detail.openDetail(a, 'expanded'); };
  closeDetail = detail.closeDetail;
  cycle = (artistId) => { cycleStatus(artistId); };
  return null;
}

async function openSheet(picks: Record<string, 'maybe' | 'will_go'> = {}): Promise<void> {
  for (const [artistId, status] of Object.entries(picks)) {
    await setInterest(SLUG, artistId, status);
  }
  await hydrateInterests(SLUG);
  await render(<PerfProviders><><Controls /><ArtistDetailSheet /></></PerfProviders>);
  await act(async () => { openDetail(BASTION); });
}

const overlapLines = (): number => screen.queryAllByText('Overlaps with 1 other event(s)').length;

beforeEach(async () => {
  sync(EVENTS);
  await setInterest(SLUG, 'bastion', 'none');
  await setInterest(SLUG, 'rival', 'none');
  await hydrateInterests(SLUG);
});

it('lists each set with its stage, its calendar date and its time', async () => {
  await openSheet();
  expect(screen.getAllByText('Octagon')).toHaveLength(3);
  expect(screen.getAllByText('Wed 6')).toHaveLength(1);
  // The night set, 00:35 on Wednesday night, is dated Thursday.
  expect(screen.getAllByText('Thu 7')).toHaveLength(2);
  expect(screen.getByText('00:35–01:30')).toBeTruthy();
});

it('shows the clash once my star makes BASTION a Must-see next to RIVAL', async () => {
  await openSheet({ rival: 'will_go' });
  expect(overlapLines()).toBe(0);
  // none → Maybe → Must-see, by the sheet's own star.
  await fireEvent.press(screen.getByLabelText('Toggle interest'));
  expect(overlapLines()).toBe(0);
  await fireEvent.press(screen.getByLabelText('Toggle interest'));
  expect(overlapLines()).toBe(1);
});

it('drops the clash when a sync moves RIVAL away', async () => {
  await openSheet({ bastion: 'will_go', rival: 'will_go' });
  expect(overlapLines()).toBe(1);
  await act(async () => {
    sync(EVENTS.map((e) => (e.eventId === 'e-rival' ? { ...e, dateFrom: at('2025-08-06T18:00:00+02:00'), dateTo: at('2025-08-06T19:00:00+02:00') } : e)));
  });
  expect(overlapLines()).toBe(0);
});

describe('render counts', () => {
  it('a pick that makes a clash renders the title (its ⚠) and the clashing set\'s row only', async () => {
    await openSheet({ bastion: 'will_go', rival: 'maybe' });
    resetRenders();
    // Maybe → Must-see.
    await act(async () => { cycle('rival'); });
    expect(rendersSinceReset()).toEqual({ bastion: 1, 'e-wed': 1 });
  });

  it('a pick that changes nothing the sheet shows renders none of it', async () => {
    await openSheet({ bastion: 'will_go' });
    resetRenders();
    // none → Maybe: a Maybe does not clash.
    await act(async () => { cycle('rival'); });
    expect(rendersSinceReset()).toEqual({});
  });

  it('another artist\'s pick that changes no clash renders neither part of the sheet', async () => {
    await openSheet({ bastion: 'will_go' });
    resetPartRenders();
    // none → Maybe: a Maybe does not clash.
    await act(async () => { cycle('rival'); });
    expect(mockPartRenders).toEqual({});
  });

  it('its own star renders the header (the star), not the body, while no clash changes', async () => {
    await openSheet();
    resetPartRenders();
    // none → Maybe: BASTION's own star, no clash either way.
    await act(async () => { cycle('bastion'); });
    expect(mockPartRenders).toEqual({ header: 1 });
  });
});

describe('in Czech', () => {
  beforeEach(() => {
    setLanguageChoice('cs');
    putArtistBios(SLUG, [{
      artistId: 'bastion',
      localized: [
        { language: 'CS', content: '<p>Životopis česky</p>' },
        { language: 'EN', content: '<p>Biography in English</p>' },
      ],
    }], at('2025-08-06T09:00:00+02:00'));
  });
  afterEach(() => { setLanguageChoice('system'); });

  it('shows the Czech bio, Czech day labels and the English stage name the API has no Czech for', async () => {
    await openSheet();
    expect(screen.getByText('Životopis česky')).toBeTruthy();
    expect(screen.queryByText('Biography in English')).toBeNull();
    expect(screen.getAllByText('St 6.')).toHaveLength(1);
    expect(screen.getAllByText('Čt 7.')).toHaveLength(2);
    expect(screen.getAllByText('Octagon')).toHaveLength(3);
  });

  it('says the clash in Czech', async () => {
    await openSheet({ bastion: 'will_go', rival: 'will_go' });
    expect(screen.getAllByText('Překrývá se s jiným vystoupením').length).toBeGreaterThan(0);
  });
});

// ── My note ───────────────────────────────────────────────────────────────────
//
// Dimensions: the saved note (none, a text), the band's sets (some, none yet),
// how editing ends (Done, closing the sheet) and what was typed (text, nothing).
// Signed out here (the auth mock), so a save stays on the device; the server
// side is NoteContext.test.tsx.

describe('my note', () => {
  const LONER = artist('loner', 'LONER');

  beforeEach(async () => {
    await setNote(SLUG, 'bastion', '');
    await setNote(SLUG, 'loner', '');
    await hydrateNotes(SLUG);
  });

  const typeNote = async (text: string): Promise<void> => {
    await fireEvent.changeText(screen.getByLabelText('Edit my note'), text);
  };
  const done = async (): Promise<void> => { await fireEvent.press(screen.getByText('Done')); };
  const fontFamilyOf = (text: string): unknown => StyleSheet.flatten(screen.getByText(text).props.style).fontFamily;

  it('offers to add a note when there is none', async () => {
    await openSheet();
    expect(screen.getByText('Add a note')).toBeTruthy();
    expect(screen.queryByText('Edit my note')).toBeNull();
  });

  it('opens the editor, titled Edit my note, on Add a note', async () => {
    await openSheet();
    await fireEvent.press(screen.getByText('Add a note'));
    expect(screen.getByText('Edit my note')).toBeTruthy();
    expect(screen.getByText('0 / 1000')).toBeTruthy();
    expect(screen.queryByText('Add a note')).toBeNull();
    expect(screen.getByLabelText('Edit my note').props.placeholder).toBeUndefined();
  });

  it('shows the typed note in italic after Done, and keeps it', async () => {
    await openSheet();
    await fireEvent.press(screen.getByText('Add a note'));
    await typeNote('Front left');
    expect(screen.getByText('10 / 1000')).toBeTruthy();
    await done();
    expect(screen.getByText('Front left')).toBeTruthy();
    expect(fontFamilyOf('Front left')).toBe('Italic-Default');
    expect(screen.queryByText('Edit my note')).toBeNull();
    expect(getLocalNotes(SLUG).bastion.text).toBe('Front left');
  });

  it('draws the note, its line and the text being typed in sepia', async () => {
    await setNote(SLUG, 'bastion', 'Front left');
    await openSheet();
    const note = StyleSheet.flatten(screen.getByText('Front left').props.style);
    expect(note.color).toBe('#d2bd96');
    expect(note.borderBottomColor).toBe('#d2bd96');
    await fireEvent.press(screen.getByText('Front left'));
    expect(StyleSheet.flatten(screen.getByLabelText('Edit my note').props.style).color).toBe('#d2bd96');
  });

  it('shows a saved note without any title above it', async () => {
    await setNote(SLUG, 'bastion', 'Front left');
    await openSheet();
    expect(screen.getByText('Front left')).toBeTruthy();
    expect(screen.queryByText('Edit my note')).toBeNull();
    expect(screen.queryByText('Add a note')).toBeNull();
  });

  it('edits a saved note from its own text', async () => {
    await setNote(SLUG, 'bastion', 'Front left');
    await openSheet();
    await fireEvent.press(screen.getByText('Front left'));
    expect(screen.getByDisplayValue('Front left')).toBeTruthy();
    await typeNote('Front right');
    await done();
    expect(screen.getByText('Front right')).toBeTruthy();
  });

  it('offers Add a note again once the note is emptied', async () => {
    await setNote(SLUG, 'bastion', 'Front left');
    await openSheet();
    await fireEvent.press(screen.getByText('Front left'));
    await typeNote('   ');
    await done();
    expect(screen.getByText('Add a note')).toBeTruthy();
    expect(getLocalNotes(SLUG).bastion.text).toBe('');
  });

  it('keeps what was typed when the sheet closes while editing', async () => {
    await openSheet();
    await fireEvent.press(screen.getByText('Add a note'));
    await typeNote('Merch: red vinyl');
    await act(async () => { closeDetail(); });
    expect(getLocalNotes(SLUG).bastion.text).toBe('Merch: red vinyl');
  });

  it('keeps a draft on the device while typing, before Done', async () => {
    await openSheet();
    await fireEvent.press(screen.getByText('Add a note'));
    await typeNote('Merch');
    await act(async () => { await new Promise((r) => { setTimeout(r, 600); }); });
    expect(getLocalNotes(SLUG).bastion.text).toBe('Merch');
  });

  it('offers a note for a band with no stage and time yet', async () => {
    const collector = createDataCollector();
    collector.setArtists([BASTION, RIVAL, LONER]);
    collector.setCategories([{ slug: SLUG, categoryId: 'c1', color: 0, localized: [] } as unknown as DbCategory]);
    collector.setStages([{ slug: SLUG, stageId: 's1', imageUrl: '', thumbUrl: '', localized: [{ language: 'en', name: 'Octagon' }] } as unknown as DbStage]);
    collector.setEvents(EVENTS);
    populateCache(SLUG, collector.build(), at('2025-08-06T09:00:00+02:00'));
    await render(<PerfProviders><><Controls /><ArtistDetailSheet /></></PerfProviders>);
    await act(async () => { openDetail(LONER); });

    expect(screen.queryByText('Octagon')).toBeNull();
    await fireEvent.press(screen.getByText('Add a note'));
    await typeNote('Ask when they play');
    await done();
    expect(screen.getByText('Ask when they play')).toBeTruthy();
  });

  it('shows each artist\'s own note when the sheet moves to another artist', async () => {
    await setNote(SLUG, 'bastion', 'Front left');
    await openSheet();
    await act(async () => { openDetail(RIVAL); });
    expect(screen.queryByText('Front left')).toBeNull();
    expect(screen.getByText('Add a note')).toBeTruthy();
  });

  describe('render counts', () => {
    it('typing and saving a note renders neither the header nor the body, nor any set row', async () => {
      await openSheet({ bastion: 'will_go' });
      resetPartRenders();
      resetRenders();
      await fireEvent.press(screen.getByText('Add a note'));
      await typeNote('Front left');
      await done();
      expect(mockPartRenders).toEqual({});
      expect(rendersSinceReset()).toEqual({});
    });
  });
});
