import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const sendCommand = defineCommand({
  meta: { name: "send", description: "Send a message to a channel" },
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
    message: {
      type: "string",
      description: "Message text or markdown (reads from stdin if omitted)",
      alias: "m",
    },
    plain: {
      type: "boolean",
      description: "Send as plain text without markdown conversion",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      let text = args.message;
      if (!text && !process.stdin.isTTY) {
        text = await Bun.stdin.text();
        text = text.trimEnd();
      }

      if (!text) {
        console.error("\x1b[31m✗\x1b[0m No message provided. Use --message or pipe via stdin.");
        process.exit(1);
      }

      text = normalizeSlackText(text);
      if (args.plain) {
        const result = await client.chat.postMessage({ channel, text });
        console.log(`\x1b[32m✓\x1b[0m Message sent (ts: ${result.ts})`);
      } else {
        const blocks = await markdownToBlocks(text);
        const result = await client.chat.postMessage({ channel, text, blocks });
        console.log(`\x1b[32m✓\x1b[0m Message sent (ts: ${result.ts})`);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
