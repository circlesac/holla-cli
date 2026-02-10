import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List files" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    channel: {
      type: "string",
      description: "Channel ID or #name to filter by",
    },
    user: {
      type: "string",
      description: "User ID or @name to filter by",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const baseParams: Record<string, unknown> = {
        count: args.limit ? parseInt(args.limit, 10) : 20,
      };

      if (args.channel) {
        baseParams.channel = await resolveChannel(client, args.channel, workspace);
      }

      if (args.user) {
        baseParams.user = await resolveUser(client, args.user, workspace);
      }

      const files: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const params: Record<string, unknown> = { ...baseParams, ...(cursor ? { cursor } : {}) };
        const result = await client.files.list(params);

        for (const f of (result.files as Record<string, unknown>[] | undefined) ?? []) {
          files.push({
            id: f.id ?? "",
            name: f.name ?? "",
            filetype: f.filetype ?? "",
            size: f.size ?? 0,
            timestamp: f.timestamp ?? "",
          });
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      printOutput(files, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "filetype", label: "Type" },
        { key: "size", label: "Size" },
        { key: "timestamp", label: "Timestamp" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
