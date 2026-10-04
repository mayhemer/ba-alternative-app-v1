// ── The fixture API's one shared schedule ─────────────────────────────────────
//
// GET /share/{token} is public, so the fixture server can answer it like any
// dataset. This is the only token it knows: a friend's ba2025 schedule with a
// must-see (EXORCIZPHOBIA, artist 216) and a maybe (CRYSTAL LAKE, 35). Any other
// token answers 404, like a revoked one. Real tokens are 48 hex characters, and
// the app rejects anything else before it ever asks.
//
// Its own module so the E2E specs can import the token without importing the
// server.

export const FIXTURE_SHARE_TOKEN = '0123456789abcdef'.repeat(3);
export const FIXTURE_FRIEND_LABEL = 'Fixture Friend';

export const SHARED_SCHEDULE = {
  slug: 'ba2025',
  label: FIXTURE_FRIEND_LABEL,
  interests: [
    { slugArtistId: 'ba2025#216', status: 'will_go' },
    { slugArtistId: 'ba2025#35', status: 'maybe' },
  ],
};
