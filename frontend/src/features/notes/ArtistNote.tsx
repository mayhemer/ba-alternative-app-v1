import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, TextInput, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../../ui/Text';
import { colors, NO_FOCUS_RING } from '../../styling/tokens';
import { useNoteActions, useNoteText } from './NoteContext';
import { artistNoteModel, noteEditorModel, noteToSave } from './ArtistNote.model';

// ── My note on the artist sheet ───────────────────────────────────────────────
//
// Draws its models (ArtistNote.model.ts): "Add a note", or the saved note in
// sepia italic over a sepia line, each with a pencil; a tap edits it in place. Editing
// ends on Done, on leaving the field and when the sheet closes or moves to
// another artist (the sheet keys this by artist, so it unmounts): each saves the
// trimmed draft, on the device and, signed in, on the server. While typing, the
// draft is kept on the device every half second, so a killed app loses little.
//
// Subscribes to its own artist's note only, so a save renders this alone.

const ICON_SIZE = 18;
const ROW_MIN_HEIGHT = 44;
const EDITOR_HEIGHT = 132;
const TEXT_SIZE = 15;
const TEXT_LINE_HEIGHT = 21;
const UNDERLINE_GAP = 4;
const DRAFT_SAVE_DELAY_MS = 500;
const ITALIC_FONT = 'Italic-Default';

// Inside the native sheet, the sheet's own input keeps the field above the
// keyboard; the web build draws the body in a plain ScrollView.
const NoteInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;

type Props = {
  artistId: string;
  /** Editing started: the sheet brings the note into view, above the keyboard. */
  onEditStart?: () => void;
};

export function ArtistNote({ artistId, onEditStart }: Props) {
  const text = useNoteText(artistId);
  const { saveNote, saveDraft } = useNoteActions();

  // null while not editing.
  const [draft, setDraft] = useState<string | null>(null);
  const draftRef = useRef<string | null>(null);
  const textAtStartRef = useRef('');

  const startEdit = useCallback((): void => {
    textAtStartRef.current = text;
    draftRef.current = text;
    setDraft(text);
    onEditStart?.();
  }, [text, onEditStart]);

  const changeDraft = useCallback((next: string): void => {
    draftRef.current = next;
    setDraft(next);
  }, []);

  // Ends editing and saves what changed. Safe to call twice (Done, then blur).
  const commit = useCallback((): void => {
    const current = draftRef.current;
    if (current === null) { return; }
    draftRef.current = null;
    setDraft(null);
    const next = noteToSave(current);
    if (next !== textAtStartRef.current) {
      saveNote(artistId, next).catch(() => undefined);
    }
  }, [artistId, saveNote]);

  // The sheet closing or moving to another artist unmounts this mid-edit.
  const commitRef = useRef(commit);
  useEffect(() => { commitRef.current = commit; }, [commit]);
  useEffect(() => () => { commitRef.current(); }, []);

  // Keep the draft on the device while typing.
  useEffect(() => {
    if (draft === null) { return undefined; }
    const timer = setTimeout(() => {
      saveDraft(artistId, noteToSave(draft)).catch(() => undefined);
    }, DRAFT_SAVE_DELAY_MS);
    return () => { clearTimeout(timer); };
  }, [artistId, draft, saveDraft]);

  // Bring the field into view again once the keyboard is up and the sheet's
  // content has shrunk above it.
  const editing = draft !== null;
  useEffect(() => {
    if (!editing || onEditStart === undefined) { return undefined; }
    const subscription = Keyboard.addListener('keyboardDidShow', () => { onEditStart(); });
    return () => { subscription.remove(); };
  }, [editing, onEditStart]);

  const note = useMemo(() => artistNoteModel(text), [text]);

  if (draft !== null) {
    return <NoteEditor draft={draft} onChange={changeDraft} onDone={commit} />;
  }

  if (note.kind === 'empty') {
    return (
      <Pressable
        onPress={startEdit}
        accessibilityRole="button"
        style={{ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start' }}
      >
        <Ionicons name="create-outline" size={ICON_SIZE} color={colors.textMuted} />
        <Text style={{ fontSize: TEXT_SIZE, color: colors.textMuted }}>{note.label}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={startEdit}
      accessibilityRole="button"
      accessibilityHint={note.accessibilityHint}
      style={{ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
    >
      <Ionicons name="create-outline" size={ICON_SIZE} color={colors.textMuted} style={{ marginTop: 2 }} />
      <Text
        style={{
          flex: 1,
          fontFamily: ITALIC_FONT,
          fontSize: TEXT_SIZE,
          lineHeight: TEXT_LINE_HEIGHT,
          color: colors.note,
          paddingBottom: UNDERLINE_GAP,
          borderBottomWidth: 1,
          borderBottomColor: colors.note,
        }}
      >
        {note.text}
      </Text>
    </Pressable>
  );
}

// ── The editor ────────────────────────────────────────────────────────────────

type EditorProps = {
  draft: string;
  onChange: (next: string) => void;
  onDone: () => void;
};

function NoteEditor({ draft, onChange, onDone }: EditorProps) {
  const editor = noteEditorModel(draft);
  return (
    <View>
      <View style={{ minHeight: ROW_MIN_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, color: colors.textMuted }}>{editor.title}</Text>
        <Pressable onPress={onDone} accessibilityRole="button" hitSlop={8} style={{ paddingLeft: 16, paddingVertical: 10 }}>
          <Text style={{ fontSize: TEXT_SIZE, fontWeight: '700', fontFamily: 'Bold-Default', color: colors.accent }}>{editor.done}</Text>
        </Pressable>
      </View>
      <NoteInput
        value={draft}
        onChangeText={onChange}
        onBlur={onDone}
        autoFocus
        multiline
        maxLength={editor.maxLength}
        accessibilityLabel={editor.title}
        textAlignVertical="top"
        style={[{
          height: EDITOR_HEIGHT,
          paddingHorizontal: 14,
          paddingVertical: 12,
          backgroundColor: colors.surfaceRaised,
          borderWidth: 1,
          borderColor: colors.accent,
          borderRadius: 8,
          color: colors.note,
          fontFamily: ITALIC_FONT,
          fontSize: TEXT_SIZE,
          lineHeight: TEXT_LINE_HEIGHT,
        }, NO_FOCUS_RING]}
      />
      <Text style={{ alignSelf: 'flex-end', marginTop: 6, fontSize: 12, color: colors.textMuted }}>{editor.counter}</Text>
    </View>
  );
}
