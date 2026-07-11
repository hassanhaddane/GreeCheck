/**
 * Library domain — "Mes scans" (history) + favorites.
 * Data lives ONLY on the device (IndexedDB via services/storage).
 */

/** One entry in the local scan history (also reused for favorites). */
export interface ScanHistoryItem {
  barcode: string;
  name: string;
  imageUrl?: string;
  score: number;
  verdict: string;
  scannedAt: number;
  favorite?: boolean;
}

/** A favorite is a pinned history item. */
export type FavoriteItem = ScanHistoryItem;
