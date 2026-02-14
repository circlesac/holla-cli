import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

export const historyCommand = defineCommand({
  meta: { name: "history", description: "Fetch channel message history" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    thread: {
      type: "string",
      description: "Thread timestamp to fetch replies for",
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

      if (args.thread) {
        do {
          const result = await client.conversations.replies({
            channel: channelId,
            ts: args.thread,
            limit,
            cursor,
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
      } else {
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
      }

      printOutput(messages, getOutputFormat(args), [
        { key: "ts", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "text", label: "Text" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
