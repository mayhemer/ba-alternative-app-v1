# Artist List View

## Layout

- Scrollable list, alphabetical, with first-letter section separators.
- Include only `DbArtists.isPlayable` artists
- One row per artist: photo (from `DbArtist.thumbUrl`), name, genre (single fixed string from artist data), country, StarButton.
- Tapping a row opens ArtistDetailScreen fully expanded.

## Filtering

- Filter by interest state (none / maybe / must see).
- Text search on artist name.
- Filter controls live in TopBar.

## Elements and their sources

Each element computes what it shows in a pure model next to its component:

| Element | Model | Source |
|---|---|---|
| The list | `screens/ArtistList.model.ts` | the cached artists (bands only), the search, the lens: which artists, grouped and sorted; "loading" while nothing is cached, "No artists found" when the filters leave nothing |
| A row | `components/ArtistRow.model.ts` | the artist, my pick and the friends who picked them: name, genre and country only when known, thumbnail or placeholder, facepile, star |
| A letter header | `components/SectionSeparator.model.ts` | the first character of the name: diacritics folded, a digit → "#"; the list groups by the same rule |

- Search: case-insensitive, part of the name; blank or spaces only lists everything.
- Lens: "My picks" lists my Maybes and Must-sees (a "don't go" is not a pick); a friend's lens lists
  their picks. The row's star is always **my** pick.
- A row renders again only when its model changes: a pick renders its row alone.
