'use strict';
/**
 * Simple in-memory cache — avoids hammering Turso for frequently read, rarely changed data.
 * TTL defaults to 30 seconds. Use cache.invalidate(key) after writes.
 */

const store = new Map(); // key → { value, expiresAt }

const cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { store.delete(key); return null; }
    return entry.value;
  },

  set(key, value, ttlMs = 30_000) {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  },

  invalidate(key) {
    store.delete(key);
  },

  invalidatePattern(prefix) {
    for (const k of store.keys()) {
      if (k.startsWith(prefix)) store.delete(k);
    }
  },

  /** Async helper: return cached value or compute and cache it */
  async getOrSet(key, fn, ttlMs = 30_000) {
    const cached = this.get(key);
    if (cached !== null) return cached;
    const value = await fn();
    this.set(key, value, ttlMs);
    return value;
  },

  size() { return store.size; },
};

module.exports = cache;
