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
