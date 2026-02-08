import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List files" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    channel: {
      type: "string",
      description: "Channel ID or #name to filter by",
    },
    user: {
      type: "string",
      description: "User ID or @name to filter by",
    },
    limit: {
      type: "string",
      description: "Number of files to return (default 20)",
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

      if (args.channel) {
        params.channel = await resolveChannel(client, args.channel);
      }

      if (args.user) {
        params.user = await resolveUser(client, args.user);
      }

      if (args.cursor) {
        params.cursor = args.cursor;
      }

      const result = await client.files.list(params);

      const files = ((result.files as Record<string, unknown>[] | undefined) ?? []).map(
        (f) => ({
          id: f.id ?? "",
          name: f.name ?? "",
          filetype: f.filetype ?? "",
          size: f.size ?? 0,
          timestamp: f.timestamp ?? "",
        }),
      );

      printOutput(files, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "filetype", label: "Type" },
        { key: "size", label: "Size" },
        { key: "timestamp", label: "Timestamp" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
