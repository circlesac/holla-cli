import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const replyCommand = defineCommand({
  meta: { name: "reply", description: "Reply to a thread" },
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
    thread: {
      type: "string",
      description: "Thread timestamp to reply to (e.g. 1234567890.123456)",
      alias: "t",
      required: true,
    },
    text: {
      type: "string",
      description: "Message text or markdown (reads from stdin if omitted)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

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
      const thread_ts = args.thread;
      const blocks = await markdownToBlocks(text);
      const result = await client.chat.postMessage({ channel, text, blocks, thread_ts });
      console.log(`\x1b[32m✓\x1b[0m Reply sent (ts: ${result.ts})`);
    } catch (error) {
      handleError(error);
    }
  },
});
