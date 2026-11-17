# Artist Detail View

- Rendered as a modal overlay above the navigator stack.
- Reused from both Artist List and Timeline contexts.
- Contains: artist info, genre, country, photo, set time and stage/category (when timeline data is available), StarButton, my note.
- Genre, country, stage names and the bio are in the app language (Czech or English, by the system language), falling back to English where the API has no Czech; see [localization.md](architecture/localization.md).
- The BottomTray is a specific collapsed state of ArtistDetailScreen — same component, different presentation state.

## States

**Collapsed (BottomTray) — from Timeline**
- Spring animates up from bottom, ~20–25% screen height.
- Shows artist name, category, time, StarButton, and partial content (e.g. partially visible photo) hinting at scrollable detail below.
- Exact partial content behavior TBD.
- Expand by swiping up. Dismiss by swiping down or tapping outside.

**Fully Expanded — from Artist List or by swiping up from BottomTray**
- Overlays full screen including TopBar.
- Closed by swipe-from-left gesture (overrides drawer gesture in this context).
- Back button visible — placement TBD (TopBar or BottomBar).

## Elements and their sources

Each element computes what it shows in a pure model next to its component (`src/features/artist-detail/`):

| Element | Model | Source |
|---|---|---|
| Title row | `ArtistDetailTitle.model.ts` | the artist, my pick, whether a set clashes, the content width: the name sized to the room the controls drawn leave (star, ⚠, ✕ on web), genre · country |
| A set | `ArtistSetRow.model.ts` | the set, its stage and category, its conflict entry: stage, **calendar** date (a set at 00:35 on Wednesday night reads "Thu 7"), time, "Overlaps with N other event(s)"; a tap goes to the festival day the timeline draws it on |
| Links | `ArtistLinks.model.ts` | the artist: streaming searches for a band, the web page's domain |
| Hero | `ArtistHero.model.ts` | the content width and the viewport height: 3:2, capped |
| Friends who picked it | `features/social/FriendPickList.model.ts` | the friends' picks: summary and rows |
| My note | `features/notes/ArtistNote.model.ts` | my saved note on the artist: "Add a note", or the note; while editing, the draft: "Edit my note", the counter |

The ⚠ and each set's overlap line come from the shared conflict calculation (`useConflicts`), the one
My plan, the timeline's bars and the drawer's count follow.

## My note

A private note per artist and edition, mine only: never shared with friends and shown nowhere but
this sheet (no mark on rows, timeline blocks or My plan). Mockup:
https://claude.ai/artifact/Rx1pawsyytvVfodr6ENYbi.

- **Where**: in the body, between the sets and the bio. With no set yet, under the photo, 30 pt
  below it like the sets. Not in the collapsed sheet's header: the collapsed sheet shows it only if
  its body reaches that far.
- **No note**: a grey pencil and "Add a note" in grey (`textMuted`), no border.
- **A note**: the pencil, then the text as written (line breaks kept) in sepia (`note`, #d2bd96)
  Work Sans Italic (`Italic-Default`, a real italic face: iOS would not slant the regular one,
  Android would fake it), with a 1 pt line in the same sepia 4 pt under the text only, not under
  the pencil. Sepia and italic set it apart from the band's white bio.
  No title, no panel. The whole note is the tap target; it reads its text, with the hint "Edit my
  note".
- **Editing**: "Edit my note" and **Done** above a 132 pt field (raised surface, accent frame,
  sepia italic), a counter "n / 1000" below. The sheet opens fully and scrolls the note into view, again
  once the keyboard is up; inside the native sheet the field is the sheet's own input, which keeps
  the content above the keyboard.
- **Saving**: Done, leaving the field, closing the sheet or moving it to another artist each save
  the draft trimmed; only whitespace clears the note. While typing, the draft is kept on the device
  every 0.5 s, so a killed app loses little. Saving re-renders the note alone.
- **Storage and sync** (`features/notes/NoteContext`, `cache/notesCache`): like the picks, see
  [auth-merge-flow.md](../../general/design/auth-merge-flow.md). Kept on the device at once
  (`user:notes:v1:<slug>`), sent to the server when signed in (`PUT /user/:slug/notes/:artistId`),
  merged per artist by the newer `updatedAt` at launch, on signing in and on an edition switch. A
  cleared note is an empty text with its date. A failed send is not retried until the next merge.
  The newer edit wins whole, so the same note edited on two devices before they sync keeps only the
  later text.
