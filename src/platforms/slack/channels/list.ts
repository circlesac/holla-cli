import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List channels" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    limit: {
      type: "string",
      description: "Number of channels to return (default 20)",
    },
    all: {
      type: "boolean",
      description: "Auto-paginate to fetch all channels",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor",
    },
    types: {
      type: "string",
      description:
        "Comma-separated channel types (default: public_channel,private_channel)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const limit = args.limit ? parseInt(args.limit, 10) : 20;
      const types = args.types ?? "public_channel,private_channel";

      const channels: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.conversations.list({
          limit,
          types,
          cursor,
        });

        for (const ch of result.channels ?? []) {
          channels.push({
            id: ch.id ?? "",
            name: ch.name ?? "",
            topic: (ch.topic as { value?: string })?.value ?? "",
            num_members: ch.num_members ?? 0,
          });
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      printOutput(channels, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "topic", label: "Topic" },
        { key: "num_members", label: "Members" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
