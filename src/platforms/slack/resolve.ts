import type { WebClient } from "@slack/web-api";
import { fetchAllChannels, fetchAllUsers } from "./lists.ts";
import { rateLimitRetry } from "../../lib/rate-limit.ts";

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

export async function resolveChannel(
  client: WebClient,
  input: string,
  workspace: string,
): Promise<string> {
  if (!input.startsWith("#")) return input;
  const name = input.slice(1);
  const records = await fetchAllChannels(client, workspace);
  const map: Record<string, string> = {};
  for (const r of records) if (r.name) map[r.name] = r.id;
  const id = map[name];
  if (id) return id;
  throw new Error(`Channel not found: ${input}${suggest(name, Object.keys(map))}`);
}

export async function resolveUser(
  client: WebClient,
  input: string,
  workspace: string,
): Promise<string> {
  if (!input.startsWith("@")) return input;
  const name = input.slice(1);
  const records = await fetchAllUsers(client, workspace);
  const map: Record<string, string> = {};
  for (const r of records) if (r.name) map[r.name] = r.id;
  const id = map[name];
  if (!id) throw new Error(`User not found: ${input}${suggest(name, Object.keys(map))}`);
  return id;
}

export async function resolveUserName(
  client: WebClient,
  userId: string,
  workspace: string,
): Promise<string> {
  const records = await fetchAllUsers(client, workspace);
  for (const r of records) if (r.id === userId) return r.name || userId;
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
  const result = await rateLimitRetry(() => client.usergroups.list());
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
