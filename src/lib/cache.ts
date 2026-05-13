import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { getCacheDir } from "./config.ts";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

export interface ListCacheEntry<T> {
  updatedAt: number;
  data: T[];
}

export interface HistoryCacheEntry {
  updatedAt: number;
  newestTs: string;
  messages: Record<string, unknown>[];
}

function cachePath(workspace: string, key: string): string {
  return join(getCacheDir(), `${workspace}-${key}.json`);
}

async function readJSON<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

async function writeJSON(path: string, value: unknown): Promise<void> {
  await mkdir(getCacheDir(), { recursive: true });
  await writeFile(path, JSON.stringify(value));
}

export function shouldBypassCache(args: Record<string, unknown>): boolean {
  return Boolean(args["no-cache"]);
}

export function isFresh(entry: { updatedAt: number }, ttlMs = DEFAULT_TTL_MS): boolean {
  return Date.now() - entry.updatedAt < ttlMs;
}

export async function loadListCache<T>(
  workspace: string,
  key: string,
): Promise<ListCacheEntry<T> | null> {
  const path = cachePath(workspace, key);
  const entry = await readJSON<ListCacheEntry<T>>(path);
  if (!entry || typeof entry.updatedAt !== "number" || !Array.isArray(entry.data)) {
    return null;
  }
  return entry;
}

export async function saveListCache<T>(
  workspace: string,
  key: string,
  data: T[],
): Promise<void> {
  const entry: ListCacheEntry<T> = { updatedAt: Date.now(), data };
  await writeJSON(cachePath(workspace, key), entry);
}

/**
 * Stale-while-revalidate for full-list resources (users list, channels list, channels members).
 *
 * - Fresh cache → return cached data without calling the fetcher.
 * - Stale cache → call fetcher, replace cache, return fresh data. The stale entry is
 *   only thrown away after a successful fetch, so cold-start cost is paid once.
 * - bypass=true forces the fetcher and refreshes the cache.
 */
export async function revalidateList<T>(
  workspace: string,
  key: string,
  fetcher: () => Promise<T[]>,
  options: { bypass?: boolean; ttlMs?: number } = {},
): Promise<T[]> {
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  if (!options.bypass) {
    const entry = await loadListCache<T>(workspace, key);
    if (entry && isFresh(entry, ttl)) return entry.data;
  }
  const data = await fetcher();
  await saveListCache(workspace, key, data);
  return data;
}

export async function loadHistoryCache(
  workspace: string,
  channelId: string,
): Promise<HistoryCacheEntry | null> {
  const path = cachePath(workspace, `history-${channelId}`);
  const entry = await readJSON<HistoryCacheEntry>(path);
  if (
    !entry ||
    typeof entry.updatedAt !== "number" ||
    typeof entry.newestTs !== "string" ||
    !Array.isArray(entry.messages)
  ) {
    return null;
  }
  return entry;
}

export async function saveHistoryCache(
  workspace: string,
  channelId: string,
  messages: Record<string, unknown>[],
  newestTs: string,
): Promise<void> {
  const entry: HistoryCacheEntry = { updatedAt: Date.now(), newestTs, messages };
  await writeJSON(cachePath(workspace, `history-${channelId}`), entry);
}

export function pickNewestTs(messages: Record<string, unknown>[], fallback = ""): string {
  let newest = fallback;
  for (const msg of messages) {
    const ts = typeof msg.ts === "string" ? msg.ts : "";
    if (ts && (newest === "" || compareTs(ts, newest) > 0)) {
      newest = ts;
    }
  }
  return newest;
}

// Slack timestamps look like "1719876543.123456" — string compare works because
// the integer-seconds segment has a fixed length on the relevant time horizon.
// Use numeric compare to be defensive against any weird padding.
export function compareTs(a: string, b: string): number {
  const av = parseFloat(a);
  const bv = parseFloat(b);
  if (Number.isNaN(av) || Number.isNaN(bv)) return a.localeCompare(b);
  return av - bv;
}
