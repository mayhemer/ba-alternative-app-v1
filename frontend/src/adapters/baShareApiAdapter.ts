import type { DbUserInterest } from '../types/backend';

// ── Config ────────────────────────────────────────────────────────────────────

const API_ORIGIN = 'https://api.ba.janbambas.cz';

// Public origin that hosts the web app + universal/app links. The shareable link
// is `${SHARE_LINK_ORIGIN}/add-friend/<token>` — the token is the only thing in
// the URL; the sharer's name/avatar travel inside the GET /share response body.
export const SHARE_LINK_ORIGIN = 'https://ba.janbambas.cz';
export const SHARE_LINK_PATH = 'add-friend';

export function buildShareUrl(token: string): string {
  return `${SHARE_LINK_ORIGIN}/${SHARE_LINK_PATH}/${token}`;
}

// A share token is `randomBytes(24).toString('hex')` on the backend — i.e. 24
// bytes rendered as 48 lowercase hex characters.
const TOKEN_RE = /^[0-9a-f]{48}$/;

// Accepted link prefixes (case the input is a full link rather than a bare token).
const LINK_PREFIXES = [
  `${SHARE_LINK_ORIGIN}/${SHARE_LINK_PATH}/`,
  `ba://${SHARE_LINK_PATH}/`,
];

/**
 * Strictly extracts a share token. Accepts ONLY:
 *   - a bare token: 48 hex chars, or
 *   - the canonical link: `<origin>/add-friend/<token>` (https or ba:// scheme).
 * Returns null for anything else — no best-effort path scraping.
 */
export function extractShareToken(input: string): string | null {
  const t = input.trim();
  if (TOKEN_RE.test(t)) { return t; }
  for (const prefix of LINK_PREFIXES) {
    if (t.startsWith(prefix)) {
      const rest = t.slice(prefix.length).replace(/\/+$/, '');
      if (TOKEN_RE.test(rest)) { return rest; }
    }
  }
  return null;
}

// ── Response shapes ─────────────────────────────────────────────────────────────

// Server-side interest status (subset of DbUserInterest['status']) as seen by a viewer.
export type SharedInterestStatus = 'will_go' | 'maybe';

// GET /share/{token}
export type SharedScheduleResponse = {
  slug: string;
  label: string;
  avatarUrl?: string;
  interests: DbUserInterest[];
};

// POST /{slug}/share
export type CreateShareResponse = {
  token: string;
  label: string;
  avatarUrl?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function authedFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status} for ${path}`);
  }
  if (response.status === 204) { return undefined as unknown as T; }
  return response.json() as Promise<T>;
}

// ── Adapter functions ─────────────────────────────────────────────────────────

/**
 * Mints a share token for the authenticated user's schedule in the given festival
 * edition. The display name/avatar are derived server-side from the Cognito JWT —
 * no client-supplied identity is sent.
 */
export async function createShareLink(
  slug: string,
  authToken: string,
): Promise<CreateShareResponse> {
  return authedFetch<CreateShareResponse>(`/${slug}/share`, authToken, { method: 'POST' });
}

/**
 * Fetches a shared schedule by its public token. No authentication required.
 * Throws on 404 (revoked/unknown token).
 */
export async function fetchSharedSchedule(token: string): Promise<SharedScheduleResponse> {
  const response = await fetch(`${API_ORIGIN}/share/${token}`);
  if (!response.ok) {
    throw new Error(`API error ${response.status} for /share/${token}`);
  }
  return response.json() as Promise<SharedScheduleResponse>;
}

/**
 * Revokes a share token. Only the owner (authenticated) may revoke it.
 */
export async function revokeShareLink(token: string, authToken: string): Promise<void> {
  await authedFetch<void>(`/share/${token}`, authToken, { method: 'DELETE' });
}
