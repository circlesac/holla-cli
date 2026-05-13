import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";
import { shouldBypassCache } from "../../../lib/cache.ts";
import { fetchAllChannels } from "../lists.ts";

const DEFAULT_TYPES = "public_channel,private_channel";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List channels" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    types: {
      type: "string",
      description:
        "Comma-separated channel types (default: public_channel,private_channel)",
    },
    name: {
      type: "string",
      description: "Filter channels by name (case-insensitive substring match)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const nameFilter = args.name ? args.name.toLowerCase() : undefined;
      const customTypes = args.types && args.types !== DEFAULT_TYPES;
      const customPagination = Boolean(args.cursor) || Boolean(args.limit);
      // The shared cache only stores the canonical channel set (public+private,
      // non-archived). Only use it when the user is asking for the full set
      // (--all) without custom filters.
      const canUseCache = Boolean(args.all) && !customTypes && !customPagination;

      const channels: Record<string, unknown>[] = [];

      if (canUseCache) {
        const records = await fetchAllChannels(client, workspace, {
          bypass: shouldBypassCache(args as Record<string, unknown>),
        });
        for (const r of records) {
          if (nameFilter && !r.name.toLowerCase().includes(nameFilter)) continue;
          channels.push({
            id: r.id,
            name: r.name,
            topic: r.topic_value ?? "",
            num_members: r.num_members ?? 0,
          });
        }
      } else {
        const limit = args.limit ? parseInt(args.limit, 10) : undefined;
        const types = args.types ?? DEFAULT_TYPES;
        let cursor: string | undefined = args.cursor;
        do {
          const result = await client.conversations.list({
            ...(limit !== undefined ? { limit } : {}),
            types,
            cursor,
          });
          for (const ch of result.channels ?? []) {
            const chName = ch.name ?? "";
            if (nameFilter && !chName.toLowerCase().includes(nameFilter)) continue;
            channels.push({
              id: ch.id ?? "",
              name: chName,
              topic: (ch.topic as { value?: string })?.value ?? "",
              num_members: ch.num_members ?? 0,
            });
          }
          cursor = result.response_metadata?.next_cursor || undefined;
        } while (args.all && cursor);
      }

      printOutput(channels, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "topic", label: "Topic" },
        { key: "num_members", label: "Members" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
