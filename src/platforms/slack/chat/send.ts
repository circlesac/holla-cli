import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

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
      description: "Message text (reads from stdin if omitted)",
      alias: "m",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel);

      let text = args.message;
      if (!text) {
        text = await Bun.stdin.text();
        text = text.trimEnd();
      }

      if (!text) {
        console.error("\x1b[31m✗\x1b[0m No message provided. Use --message or pipe via stdin.");
        process.exit(1);
      }

      const result = await client.chat.postMessage({ channel, text });

      console.log(`\x1b[32m✓\x1b[0m Message sent (ts: ${result.ts})`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
