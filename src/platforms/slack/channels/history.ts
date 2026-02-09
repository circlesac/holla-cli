import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const historyCommand = defineCommand({
  meta: { name: "history", description: "Fetch channel message history" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    limit: {
      type: "string",
      description: "Number of messages to return (default 20)",
    },
    all: {
      type: "boolean",
      description: "Auto-paginate to fetch all messages",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor",
    },
    before: {
      type: "string",
      description: "Only messages before this timestamp (latest)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const limit = args.limit ? parseInt(args.limit, 10) : 20;

      const messages: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.conversations.history({
          channel: channelId,
          limit,
          cursor,
          latest: args.before,
        });

        for (const msg of result.messages ?? []) {
          messages.push({
            ts: msg.ts ?? "",
            user: msg.user ?? "",
            text: msg.text ?? "",
          });
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      printOutput(messages, getOutputFormat(args), [
        { key: "ts", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "text", label: "Text" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
