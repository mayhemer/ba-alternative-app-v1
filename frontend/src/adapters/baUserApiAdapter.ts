import type { DbUserInterest } from '../types/backend';

// ── Config ────────────────────────────────────────────────────────────────────

const API_ORIGIN = 'https://api.ba.janbambas.cz';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function authedFetch<T>(
  path: string,
  token: string,
  options?: RequestInit,
): Promise<T> {
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
  // 204 No Content responses (DELETE) have no body
  if (response.status === 204) { return undefined as unknown as T; }
  return response.json() as Promise<T>;
}

// ── Server status type ────────────────────────────────────────────────────────

// Status values used by the backend (different from local InterestStatus)
type ServerInterestStatus = 'will_go' | 'maybe';

// ── Adapter functions ─────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's interest list for a festival edition.
 * Returns an empty array if the user has no saved interests.
 */
export async function fetchUserInterests(
  slug: string,
  token: string,
): Promise<DbUserInterest[]> {
  return authedFetch<DbUserInterest[]>(`/user/${slug}/schedule`, token);
}

/**
 * Creates or updates a single interest entry on the server.
 */
export async function putUserInterest(
  slug: string,
  artistId: string,
  status: ServerInterestStatus,
  token: string,
): Promise<void> {
  await authedFetch<void>(`/user/${slug}/schedule/${artistId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/**
 * Removes a single interest entry from the server.
 */
export async function deleteUserInterest(
  slug: string,
  artistId: string,
  token: string,
): Promise<void> {
  await authedFetch<void>(`/user/${slug}/schedule/${artistId}`, token, {
    method: 'DELETE',
  });
}
