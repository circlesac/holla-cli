import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List starred items" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
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
        count: args.limit ? parseInt(args.limit, 10) : 20,
      };

      if (args.cursor) {
        params.cursor = args.cursor;
      }

      const result = await client.stars.list(params);

      const items = ((result.items as Record<string, unknown>[] | undefined) ?? []).map(
        (item) => {
          const message = item.message as Record<string, unknown> | undefined;
          const file = item.file as Record<string, unknown> | undefined;
          return {
            type: item.type ?? "",
            channel: message?.channel ?? item.channel ?? "",
            ts: message?.ts ?? "",
            text: message?.text ?? file?.name ?? "",
            date_create: item.date_create ?? "",
          };
        },
      );

      printOutput(items, getOutputFormat(args), [
        { key: "type", label: "Type" },
        { key: "channel", label: "Channel" },
        { key: "ts", label: "Timestamp" },
        { key: "text", label: "Text" },
        { key: "date_create", label: "Starred At" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
