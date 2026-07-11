/**
 * Node test environment shim: in-memory IndexedDB (fake-indexeddb) +
 * a minimal localStorage stub + a `window` global so `db.ts` initializes.
 * MUST be the first import of every storage/repository test file.
 */
import "fake-indexeddb/auto";

const g = globalThis as unknown as Record<string, unknown>;
if (typeof g.window === "undefined") g.window = globalThis;

class MemoryStorage {
  [key: string]: unknown;
  getItem(key: string): string | null {
    const v = this[key];
    return typeof v === "string" ? v : null;
  }
  setItem(key: string, value: string): void {
    this[key] = String(value);
  }
  removeItem(key: string): void {
    delete this[key];
  }
}

if (typeof g.localStorage === "undefined") g.localStorage = new MemoryStorage();

export function localStorageStub(): MemoryStorage {
  return g.localStorage as MemoryStorage;
}
