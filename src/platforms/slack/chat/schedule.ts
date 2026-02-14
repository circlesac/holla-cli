import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const scheduleCommand = defineCommand({
  meta: { name: "schedule", description: "Schedule a message for later" },
  args: {
    workspace: {
      type: "string",
      description: "Workspace name",
      alias: "w",
    },
    channel: {
      type: "string",
      description: "Channel name or ID (e.g. #general or C01234567)",
      required: true,
    },
    text: {
      type: "string",
      description: "Message text in markdown format (reads from stdin if omitted)",
    },
    at: {
      type: "string",
      description: "Unix timestamp for when to send the message",
      required: true,
    },
    ts: {
      type: "string",
      description: "Thread timestamp to reply in (e.g. 1234567890.123456)",
    },
    thread: {
      type: "string",
      description: "Alias for --ts",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      const postAt = Number(args.at);
      if (Number.isNaN(postAt)) {
        console.error("\x1b[31m✗\x1b[0m --at must be a valid unix timestamp");
        process.exit(1);
      }

      let text = args.text as string | undefined;
      if (!text && !process.stdin.isTTY) {
        text = await Bun.stdin.text();
        text = text.trimEnd();
      }

      if (!text) {
        console.error("\x1b[31m✗\x1b[0m No message provided. Use --text or pipe via stdin.");
        process.exit(1);
      }

      text = normalizeSlackText(text);
      const blocks = await markdownToBlocks(text);
      const thread_ts = (args.ts ?? args.thread) || undefined;
      const result = await client.chat.scheduleMessage({
        channel,
        text,
        blocks,
        post_at: postAt,
        thread_ts,
      });

      console.log(
        `\x1b[32m✓\x1b[0m Message scheduled (id: ${result.scheduled_message_id}, post_at: ${result.post_at})`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
