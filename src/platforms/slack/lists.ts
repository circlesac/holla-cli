import type { WebClient } from "@slack/web-api";
import { revalidateList } from "../../lib/cache.ts";
import { rateLimitRetry } from "../../lib/rate-limit.ts";

export interface ChannelRecord {
  id: string;
  name: string;
  is_archived?: boolean;
  num_members?: number;
  topic_value?: string;
}

export interface UserRecord {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  deleted?: boolean;
}

export async function fetchAllChannels(
  client: WebClient,
  workspace: string,
  options: { bypass?: boolean } = {},
): Promise<ChannelRecord[]> {
  return revalidateList<ChannelRecord>(
    workspace,
    "channels",
    async () => {
      const records: ChannelRecord[] = [];
      let cursor: string | undefined;
      do {
        const result = await rateLimitRetry(() =>
          client.conversations.list({
            limit: 1000,
            types: "public_channel,private_channel",
            cursor,
            exclude_archived: true,
          }),
        );
        for (const ch of result.channels ?? []) {
          if (!ch.id) continue;
          records.push({
            id: ch.id,
            name: ch.name ?? "",
            is_archived: ch.is_archived ?? false,
            num_members: ch.num_members ?? 0,
            topic_value: (ch.topic as { value?: string } | undefined)?.value ?? "",
          });
        }
        cursor = result.response_metadata?.next_cursor || undefined;
      } while (cursor);
      return records;
    },
    options,
  );
}

export async function fetchAllUsers(
  client: WebClient,
  workspace: string,
  options: { bypass?: boolean } = {},
): Promise<UserRecord[]> {
  return revalidateList<UserRecord>(
    workspace,
    "users",
    async () => {
      const records: UserRecord[] = [];
      let cursor: string | undefined;
      do {
        const result = await rateLimitRetry(() =>
          client.users.list({ limit: 1000, cursor }),
        );
        for (const user of result.members ?? []) {
          if (!user.id) continue;
          records.push({
            id: user.id,
            name: user.name ?? "",
            real_name: user.real_name ?? "",
            display_name:
              (user.profile as { display_name?: string } | undefined)?.display_name ?? "",
            deleted: user.deleted ?? false,
          });
        }
        cursor = result.response_metadata?.next_cursor || undefined;
      } while (cursor);
      return records;
    },
    options,
  );
}
