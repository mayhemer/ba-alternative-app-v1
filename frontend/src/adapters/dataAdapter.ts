import type { DataCollector } from '../cache/cacheService';
import type { DbArtistBios } from '../types/backend';

// ── Adapter interface ─────────────────────────────────────────────────────────
// All data source adapters must implement this interface.
// Swap the concrete adapter at the usage site to change the data source.

export type ValidationResult = {
  /** true = cached data is current, no fetch needed; false = server has newer data. */
  upToDate: boolean;
  /**
   * The server's own last-rebuild time. Store this as the watermark for the next
   * `validate` call once the matching data is in the cache — a local clock
   * reading would be compared against the wrong scale and suppress all updates.
   */
  serverSyncedAt: number;
  /**
   * When the artists were last rebuilt, which moves independently of
   * `serverSyncedAt`. Cached bios stay valid while this holds steady, so a
   * schedule-only change no longer discards them.
   */
  artistsSyncedAt: number;
};

export interface DataAdapter {
  /**
   * Check whether the data cached for this slug is still current.
   * @param since the watermark from the last successful populate (0 = nothing cached).
   */
  validate(slug: string, since: number): Promise<ValidationResult>;

  /**
   * Fetch all data for this slug and write it to the collector.
   * The caller is responsible for atomically updating the cache
   * with the collected data once this resolves.
   */
  populate(slug: string, collector: DataCollector): Promise<void>;

  /**
   * Fetch every artist's bios for this edition in one request. `populate`
   * leaves them out so the list can paint sooner; this runs alongside it, not
   * before it, and keeps the app fully readable offline.
   */
  fetchAllBios(slug: string): Promise<DbArtistBios[]>;
}
