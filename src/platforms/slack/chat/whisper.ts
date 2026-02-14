import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const whisperCommand = defineCommand({
  meta: { name: "whisper", description: "Send an ephemeral message visible only to one user" },
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
    user: {
      type: "string",
      description: "User name or ID (e.g. @john or U01234567)",
      required: true,
    },
    text: {
      type: "string",
      description: "Message text in markdown format (reads from stdin if omitted)",
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
      const user = await resolveUser(client, args.user, workspace);

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
      const result = await client.chat.postEphemeral({
        channel,
        user,
        text,
        blocks,
        thread_ts,
      });

      console.log(`\x1b[32m✓\x1b[0m Ephemeral message sent (ts: ${result.message_ts})`);
    } catch (error) {
      handleError(error);
    }
  },
});
