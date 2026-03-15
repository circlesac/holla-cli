import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs, cursorPaginationArgs } from "../../../lib/args.ts";

export const repliesCommand = defineCommand({
  meta: { name: "replies", description: "Fetch thread replies" },
  args: {
    ...commonArgs,
    ...cursorPaginationArgs,
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
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const limit = args.limit ? parseInt(args.limit, 10) : undefined;

      const messages: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.conversations.replies({
          channel: channelId,
          ts: args.ts,
          limit,
          cursor,
        });

        for (const msg of result.messages ?? []) {
          const entry: Record<string, unknown> = {
            ts: msg.ts ?? "",
            user: msg.user ?? "",
            text: msg.text ?? "",
          };
          if (msg.thread_ts) entry.thread_ts = msg.thread_ts;
          if (msg.reply_count) entry.reply_count = msg.reply_count;
          if (msg.reply_users_count) entry.reply_users_count = msg.reply_users_count;
          if (msg.edited) entry.edited = msg.edited;
          if (msg.attachments?.length) entry.attachments = msg.attachments;
          if (msg.files?.length) entry.files = msg.files;
          if (msg.reactions?.length) entry.reactions = msg.reactions;
          messages.push(entry);
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

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
