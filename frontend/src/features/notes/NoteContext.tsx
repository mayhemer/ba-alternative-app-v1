import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSelectedSlug } from '../../store/AppContext';
import { useAuth } from '../../auth/AuthContext';
import { getLocalNotes, mergeServerNotes, setNote, type LocalNote } from '../../cache/notesCache';
import { fetchUserNotes, putUserNote } from '../../adapters/baUserApiAdapter';

// ── My notes, as a small store ────────────────────────────────────────────────
//
// One private note per artist (cache/notesCache). Synced like the picks
// (InterestContext): kept on the device at once, sent to the server when signed
// in, and merged with the server's copy at mount, on signing in and on an
// edition switch (the gate remounts this provider) — per artist the newer
// updatedAt wins. A failed send is not retried; the next merge sends the
// device's note again, as it is then newer than the server's.
//
// Only the artist sheet shows a note, and it subscribes to its own artist's
// note alone (useNoteText), so a save renders that note and nothing else.

type NoteMap = Record<string, string>; // artistId → text, cleared notes omitted

function toTextMap(local: Record<string, LocalNote>): NoteMap {
  const result: NoteMap = {};
  for (const [artistId, record] of Object.entries(local)) {
    if (record.text !== '') {
      result[artistId] = record.text;
    }
  }
  return result;
}

type NoteStore = {
  get: () => NoteMap;
  set: (next: NoteMap) => void;
  subscribe: (listener: () => void) => () => void;
};

function createNoteStore(initial: NoteMap): NoteStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    set: (next) => {
      current = next;
      listeners.forEach((listener) => { listener(); });
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

type NoteActions = {
  /** Saves a note on the device and, when signed in, on the server. '' clears it. */
  saveNote: (artistId: string, text: string) => Promise<void>;
  /** Keeps a draft on the device only, so a killed app does not lose what was typed. */
  saveDraft: (artistId: string, text: string) => Promise<void>;
};

const NoteStoreContext = createContext<NoteStore | null>(null);
const NoteActionsContext = createContext<NoteActions | null>(null);

export function NoteProvider({ children }: { children: React.ReactNode }) {
  const slug = useSelectedSlug();
  const { isLoggedIn, getAccessToken } = useAuth();
  // Starts from what StartupGate loaded, so the first render already has the notes.
  const [store] = useState(() => createNoteStore(toTextMap(getLocalNotes(slug))));

  const syncFromServer = useCallback(async (): Promise<void> => {
    const token = await getAccessToken();
    if (token === null) { return; }

    const serverNotes = await fetchUserNotes(slug, token);
    const merged = await mergeServerNotes(slug, serverNotes);
    store.set(toTextMap(merged));

    // Send back what the device has newer than the server: notes written signed
    // out or offline, and sends that failed. A cleared note the server never
    // had needs no send.
    const pushToken = await getAccessToken(); // may have refreshed
    if (pushToken === null) { return; }
    const serverByKey = new Map(serverNotes.map((n) => [n.slugArtistId, n]));
    for (const [artistId, record] of Object.entries(merged)) {
      const serverEntry = serverByKey.get(`${slug}#${artistId}`);
      if (serverEntry === undefined && record.text === '') { continue; }
      if (serverEntry !== undefined && record.updatedAt <= serverEntry.updatedAt) { continue; }
      putUserNote(slug, artistId, record.text, pushToken).catch(() => undefined);
    }
  }, [slug, getAccessToken, store]);

  // Signed in at mount (a launch, an edition switch): merge the server's copy.
  useEffect(() => {
    if (isLoggedIn) {
      syncFromServer().catch(() => undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Signing in later: merge then.
  const prevLoggedInRef = useRef(isLoggedIn);
  useEffect(() => {
    const justLoggedIn = !prevLoggedInRef.current && isLoggedIn;
    prevLoggedInRef.current = isLoggedIn;
    if (justLoggedIn) {
      syncFromServer().catch(() => undefined);
    }
  }, [isLoggedIn, syncFromServer]);

  const saveLocally = useCallback(async (artistId: string, text: string): Promise<void> => {
    const next = { ...store.get() };
    if (text === '') {
      delete next[artistId];
    } else {
      next[artistId] = text;
    }
    store.set(next);
    await setNote(slug, artistId, text);
  }, [slug, store]);

  const saveNote = useCallback(async (artistId: string, text: string): Promise<void> => {
    await saveLocally(artistId, text);
    const token = await getAccessToken();
    if (token === null) { return; }
    await putUserNote(slug, artistId, text, token).catch(() => undefined);
  }, [slug, saveLocally, getAccessToken]);

  const actions = useMemo(() => ({ saveNote, saveDraft: saveLocally }), [saveNote, saveLocally]);

  return (
    <NoteStoreContext.Provider value={store}>
      <NoteActionsContext.Provider value={actions}>
        {children}
      </NoteActionsContext.Provider>
    </NoteStoreContext.Provider>
  );
}

/** One artist's saved note, '' if none: re-renders its user only when that note changes. */
export function useNoteText(artistId: string): string {
  const store = useContext(NoteStoreContext);
  if (store === null) {
    throw new Error('useNoteText must be used inside NoteProvider');
  }
  const read = useCallback((): string => store.get()[artistId] ?? '', [store, artistId]);
  return useSyncExternalStore(store.subscribe, read, read);
}

/** Saving notes. Stable for the provider's life within an edition. */
export function useNoteActions(): NoteActions {
  const actions = useContext(NoteActionsContext);
  if (actions === null) {
    throw new Error('useNoteActions must be used inside NoteProvider');
  }
  return actions;
}
