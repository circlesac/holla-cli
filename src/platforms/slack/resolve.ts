import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { getCacheDir } from "../../lib/config.ts";
import type { WebClient } from "@slack/web-api";
import type { CacheEntry } from "../../types/index.ts";

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  if (!id) throw new Error(`Channel not found: ${input}`);
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
  if (!id) throw new Error(`User not found: ${input}`);
  return id;
}
