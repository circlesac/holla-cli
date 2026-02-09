import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const repliesCommand = defineCommand({
  meta: { name: "replies", description: "Fetch thread replies" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    ts: {
      type: "string",
      description: "Thread timestamp",
      required: true,
    },
    limit: {
      type: "string",
      description: "Number of replies to return",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const limit = args.limit ? parseInt(args.limit, 10) : undefined;

      const result = await client.conversations.replies({
        channel: channelId,
        ts: args.ts,
        limit,
        cursor: args.cursor,
      });

      const messages = (result.messages ?? []).map((msg) => ({
        ts: msg.ts ?? "",
        user: msg.user ?? "",
        text: msg.text ?? "",
      }));

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
