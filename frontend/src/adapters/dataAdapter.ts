import type { DataCollector } from '../cache/cacheService';

// ── Adapter interface ─────────────────────────────────────────────────────────
// All data source adapters must implement this interface.
// Swap the concrete adapter at the usage site to change the data source.

export interface DataAdapter {
  /**
   * Check if the data for this slug is up-to-date.
   * @returns true  = local data is current, no fetch needed
   * @returns false = server has newer data, fetch required
   */
  validate(slug: string, lastSyncTime: number): Promise<boolean>;

  /**
   * Fetch all data for this slug and write it to the collector.
   * The caller is responsible for atomically updating the cache
   * with the collected data once this resolves.
   */
  populate(slug: string, collector: DataCollector): Promise<void>;
}
