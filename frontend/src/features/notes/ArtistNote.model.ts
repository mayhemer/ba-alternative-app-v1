import { strings } from '../../i18n/strings';

// ── My note on the artist sheet, as a model ───────────────────────────────────
//
// What the note element shows, from the saved text alone: an offer to add one,
// or the note as written. While editing, what the editor shows from the draft.
// The component (ArtistNote.tsx) draws only these.

/** The longest note; the server rejects anything longer (backend NOTE_MAX_LENGTH). */
export const NOTE_MAX_LENGTH = 1000;

export type ArtistNoteModel =
  | { kind: 'empty'; label: string }
  | { kind: 'note'; text: string; accessibilityHint: string };

/** The saved note: '' or only whitespace reads as none. */
export function artistNoteModel(text: string | undefined): ArtistNoteModel {
  const s = strings().artistNote;
  if (text === undefined || text.trim() === '') {
    return { kind: 'empty', label: s.add };
  }
  return { kind: 'note', text, accessibilityHint: s.editTitle };
}

export type NoteEditorModel = {
  title: string;
  done: string;
  counter: string;
  maxLength: number;
};

export function noteEditorModel(draft: string): NoteEditorModel {
  const s = strings().artistNote;
  return {
    title: s.editTitle,
    done: s.done,
    counter: s.counter(draft.length, NOTE_MAX_LENGTH),
    maxLength: NOTE_MAX_LENGTH,
  };
}

/** What a draft is saved as: trimmed at both ends, within the limit; only whitespace clears. */
export function noteToSave(draft: string): string {
  return draft.trim().slice(0, NOTE_MAX_LENGTH);
}
