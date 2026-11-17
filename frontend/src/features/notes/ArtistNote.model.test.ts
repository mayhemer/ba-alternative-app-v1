import { artistNoteModel, noteEditorModel, noteToSave, NOTE_MAX_LENGTH } from './ArtistNote.model';
import { setLanguageChoice } from '../../i18n/language';

// ── My note on the artist sheet, as a model ───────────────────────────────────
//
// Dimensions: the saved text (none, empty, only whitespace, one line, several
// lines) and, while editing, the draft's length (0, 1, the limit).

afterEach(() => { setLanguageChoice('system'); });

describe('artistNoteModel', () => {
  it('offers to add a note when there is none', () => {
    expect(artistNoteModel(undefined)).toEqual({ kind: 'empty', label: 'Add a note' });
  });

  it('offers to add a note when the note was cleared', () => {
    expect(artistNoteModel('')).toEqual({ kind: 'empty', label: 'Add a note' });
  });

  it('offers to add a note when the note is only whitespace', () => {
    expect(artistNoteModel('  \n ')).toEqual({ kind: 'empty', label: 'Add a note' });
  });

  it('shows the note as written, its line breaks kept', () => {
    expect(artistNoteModel('Front left.\nMerch: red vinyl.')).toEqual({
      kind: 'note',
      text: 'Front left.\nMerch: red vinyl.',
      accessibilityHint: 'Edit my note',
    });
  });

  it('says it in Czech', () => {
    setLanguageChoice('cs');
    expect(artistNoteModel(undefined)).toEqual({ kind: 'empty', label: 'Přidat poznámku' });
  });
});

describe('noteEditorModel', () => {
  it('titles the editor and counts an empty draft', () => {
    expect(noteEditorModel('')).toEqual({
      title: 'Edit my note',
      done: 'Done',
      counter: '0 / 1000',
      maxLength: 1000,
    });
  });

  it('counts one character', () => {
    expect(noteEditorModel('x').counter).toBe('1 / 1000');
  });

  it('counts a draft at the limit', () => {
    expect(noteEditorModel('x'.repeat(1000)).counter).toBe('1000 / 1000');
  });

  it('says it in Czech', () => {
    setLanguageChoice('cs');
    expect(noteEditorModel('ab')).toEqual({
      title: 'Upravit poznámku',
      done: 'Hotovo',
      counter: '2 / 1000',
      maxLength: 1000,
    });
  });
});

describe('noteToSave', () => {
  it('keeps the text as typed inside, trimmed at both ends', () => {
    expect(noteToSave('  Front left.\nMerch.\n\n')).toBe('Front left.\nMerch.');
  });

  it('saves only whitespace as a cleared note', () => {
    expect(noteToSave(' \n\t ')).toBe('');
  });

  it('never saves more than the limit', () => {
    expect(noteToSave('x'.repeat(1005))).toHaveLength(1000);
  });
});

it('the limit is the one the server enforces', () => {
  expect(NOTE_MAX_LENGTH).toBe(1000);
});
