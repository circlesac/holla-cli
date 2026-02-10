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

      const messages: { ts: string; user: string; text: string }[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.conversations.replies({
          channel: channelId,
          ts: args.ts,
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
