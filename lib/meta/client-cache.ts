"use client";

type CacheEnvelope<T> = {
  savedAt: number;
  value: T;
};

const API_PREFIX = "adplanner_api_cache:";
const STATE_PREFIX = "adplanner_page_state:";
const DEFAULT_TTL_MS = 1000 * 60 * 30;

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readEnvelope<T>(key: string, ttlMs = DEFAULT_TTL_MS) {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > ttlMs) {
      storage.removeItem(key);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

function writeEnvelope<T>(key: string, value: T) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // Cache is an optimization only. Ignore quota/private-mode errors.
  }
}

export function getCachedState<T>(key: string, ttlMs = DEFAULT_TTL_MS) {
  return readEnvelope<T>(`${STATE_PREFIX}${key}`, ttlMs);
}

export function setCachedState<T>(key: string, value: T) {
  writeEnvelope(`${STATE_PREFIX}${key}`, value);
}

export async function getCachedJson<T>(
  url: string,
  options: {
    force?: boolean;
    ttlMs?: number;
  } = {}
) {
  const cacheKey = `${API_PREFIX}${url}`;
  if (!options.force) {
    const cached = readEnvelope<T>(cacheKey, options.ttlMs);
    if (cached) return cached;
  }

  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(payload.error || "Khong the lay du lieu.");
  writeEnvelope(cacheKey, payload);
  return payload;
}
