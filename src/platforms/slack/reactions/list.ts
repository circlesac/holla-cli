import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List reactions made by a user" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    user: {
      type: "string",
      description: "User ID or @name (defaults to current user)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const userId = args.user
        ? await resolveUser(client, args.user, workspace)
        : undefined;

      type ReactionItem = {
        type: string;
        channel?: string;
        message?: { ts: string; text: string; thread_ts?: string; reactions?: { name: string; count: number }[] };
      };

      const allItems: ReactionItem[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const params: Record<string, unknown> = {
          full: true,
        };
        if (args.limit) params.limit = parseInt(args.limit, 10);
        if (userId) params.user = userId;
        if (cursor) params.cursor = cursor;

        const result = await client.reactions.list(params);

        const items = (result.items as ReactionItem[]) ?? [];
        allItems.push(...items);

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      const rows = allItems.map((item) => {
        const row: Record<string, string> = {
          type: item.type,
          channel: item.channel ?? "",
          ts: item.message?.ts ?? "",
          text: (item.message?.text ?? "").slice(0, 80),
          reactions: (item.message?.reactions ?? [])
            .map((r) => `:${r.name}: (${r.count})`)
            .join(", "),
        };
        if (item.message?.thread_ts) row.thread_ts = item.message.thread_ts;
        return row;
      });

      printOutput(rows, getOutputFormat(args), [
        { key: "type", label: "Type" },
        { key: "channel", label: "Channel" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
        { key: "reactions", label: "Reactions" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
