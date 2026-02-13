import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { getCacheDir } from "../../lib/config.ts";
import type { WebClient } from "@slack/web-api";
import type { CacheEntry } from "../../types/index.ts";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_SUGGESTIONS = 3;

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }
  return dp[m]![n]!;
}

function suggest(input: string, candidates: string[]): string {
  const scored = candidates
    .map((c) => ({ name: c, dist: levenshtein(input.toLowerCase(), c.toLowerCase()) }))
    .filter((c) => c.dist <= Math.max(3, Math.floor(input.length / 2)))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_SUGGESTIONS);
  if (scored.length === 0) return "";
  return `\n  Did you mean: ${scored.map((s) => s.name).join(", ")}?`;
}

interface NameMap {
  [name: string]: string;
}

function cacheFileName(workspace: string, key: string): string {
  return `${workspace}-${key}.json`;
}

async function loadCache(workspace: string, key: string): Promise<NameMap | null> {
  try {
    const path = join(getCacheDir(), cacheFileName(workspace, key));
    const content = await readFile(path, "utf-8");
    const entry = JSON.parse(content) as CacheEntry<NameMap>;
    if (Date.now() > entry.expiresAt) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function saveCache(workspace: string, key: string, data: NameMap): Promise<void> {
  const path = join(getCacheDir(), cacheFileName(workspace, key));
  const entry: CacheEntry<NameMap> = {
    data,
    expiresAt: Date.now() + CACHE_TTL,
  };
  await writeFile(path, JSON.stringify(entry));
}

async function fetchChannelMap(client: WebClient, workspace: string): Promise<NameMap> {
  const cached = await loadCache(workspace, "channels");
  if (cached) return cached;

  const map: NameMap = {};
  let cursor: string | undefined;

  do {
    const result = await client.conversations.list({
      limit: 200,
      types: "public_channel,private_channel",
      cursor,
      exclude_archived: true,
    });
    for (const ch of result.channels ?? []) {
      if (ch.name && ch.id) {
        map[ch.name] = ch.id;
      }
    }
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  await saveCache(workspace, "channels", map);
  return map;
}

async function fetchUserMap(client: WebClient, workspace: string): Promise<NameMap> {
  const cached = await loadCache(workspace, "users");
  if (cached) return cached;

  const map: NameMap = {};
  let cursor: string | undefined;

  do {
    const result = await client.users.list({ limit: 200, cursor });
    for (const user of result.members ?? []) {
      if (user.name && user.id) {
        map[user.name] = user.id;
      }
    }
    cursor = result.response_metadata?.next_cursor || undefined;
  } while (cursor);

  await saveCache(workspace, "users", map);
  return map;
}

export async function resolveChannel(
  client: WebClient,
  input: string,
  workspace: string,
): Promise<string> {
  if (!input.startsWith("#")) return input;
  const name = input.slice(1);
  const map = await fetchChannelMap(client, workspace);
  const id = map[name];
  if (!id) throw new Error(`Channel not found: ${input}${suggest(name, Object.keys(map))}`);
  return id;
}

export async function resolveUser(
  client: WebClient,
  input: string,
  workspace: string,
): Promise<string> {
  if (!input.startsWith("@")) return input;
  const name = input.slice(1);
  const map = await fetchUserMap(client, workspace);
  const id = map[name];
  if (!id) throw new Error(`User not found: ${input}${suggest(name, Object.keys(map))}`);
  return id;
}

export async function resolveUserName(
  client: WebClient,
  userId: string,
  workspace: string,
): Promise<string> {
  const map = await fetchUserMap(client, workspace);
  for (const [name, id] of Object.entries(map)) {
    if (id === userId) return name;
  }
  return userId;
}

export interface ResolvedGroup {
  id: string;
  name: string;
  handle: string;
}

export async function resolveGroup(
  client: WebClient,
  input: string,
): Promise<ResolvedGroup> {
  const result = await client.usergroups.list();
  const groups = (result.usergroups ?? []) as Array<{ id?: string; name?: string; handle?: string }>;

  const handles = groups.map((g) => g.handle ?? "").filter(Boolean);

  // If input looks like a group ID (starts with S), match by ID
  if (/^S[A-Z0-9]+$/.test(input)) {
    const group = groups.find((g) => g.id === input);
    if (!group) throw new Error(`User group not found: ${input}${suggest(input, handles)}`);
    return { id: group.id!, name: group.name ?? "", handle: group.handle ?? "" };
  }

  // Otherwise match by handle
  const group = groups.find((g) => g.handle === input);
  if (!group) throw new Error(`User group not found: ${input}${suggest(input, handles)}`);
  return { id: group.id!, name: group.name ?? "", handle: group.handle ?? "" };
}
