import type { DataCollector } from '../cache/cacheService';

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
}
