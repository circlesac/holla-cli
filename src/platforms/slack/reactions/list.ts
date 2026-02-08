import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List reactions made by a user" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    user: {
      type: "string",
      description: "User ID or @name (defaults to current user)",
    },
    limit: {
      type: "string",
      description: "Number of items to return (default 20)",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: Record<string, unknown> = {
        limit: args.limit ? parseInt(args.limit, 10) : 20,
        full: true,
      };

      if (args.user) {
        params.user = await resolveUser(client, args.user);
      }

      if (args.cursor) {
        params.cursor = args.cursor;
      }

      const result = await client.reactions.list(params);

      const items = (
        result.items as {
          type: string;
          channel?: string;
          message?: { ts: string; text: string; reactions?: { name: string; count: number }[] };
        }[]
      ) ?? [];

      const rows = items.map((item) => ({
        type: item.type,
        channel: item.channel ?? "",
        ts: item.message?.ts ?? "",
        text: (item.message?.text ?? "").slice(0, 80),
        reactions: (item.message?.reactions ?? [])
          .map((r) => `:${r.name}: (${r.count})`)
          .join(", "),
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "type", label: "Type" },
        { key: "channel", label: "Channel" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
        { key: "reactions", label: "Reactions" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
