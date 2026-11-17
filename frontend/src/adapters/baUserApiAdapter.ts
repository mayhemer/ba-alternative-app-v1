import type { DbUserInterest, DbUserNote } from '../types/backend';
import { API_ORIGIN } from './apiConfig';

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

// Statuses a PUT may carry; 'none' is expressed as a DELETE.
type ServerInterestStatus = Exclude<DbUserInterest['status'], 'none'>;

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

// ── My notes ──────────────────────────────────────────────────────────────────

/**
 * Fetches the authenticated user's notes for a festival edition, cleared ones
 * (empty text) included.
 */
export async function fetchUserNotes(slug: string, token: string): Promise<DbUserNote[]> {
  return authedFetch<DbUserNote[]>(`/user/${slug}/notes`, token);
}

/**
 * Saves one artist's note on the server; an empty text clears it.
 */
export async function putUserNote(
  slug: string,
  artistId: string,
  text: string,
  token: string,
): Promise<void> {
  await authedFetch<void>(`/user/${slug}/notes/${artistId}`, token, {
    method: 'PUT',
    body: JSON.stringify({ text }),
  });
}
