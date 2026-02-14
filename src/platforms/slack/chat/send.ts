import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const sendCommand = defineCommand({
  meta: { name: "send", description: "Send a message to a channel" },
  args: {
    ...commonArgs,
    channel: {
      type: "string",
      description: "Channel name or ID (e.g. #general or C01234567)",
      required: true,
    },
    text: {
      type: "string",
      description: "Message text in markdown format (reads from stdin if omitted)",
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
      const blocks = await markdownToBlocks(text);
      const result = await client.chat.postMessage({ channel, text, blocks });

      const format = getOutputFormat(args);
      const msg = result.message as Record<string, unknown> | undefined;
      if (format === "json") {
        printOutput({ ts: result.ts, channel: result.channel, text: msg?.text ?? text }, format);
      } else {
        console.log(`\x1b[32m✓\x1b[0m Message sent (ts: ${result.ts})`);
        if (msg?.text) console.log(`\n  ${String(msg.text).replace(/\n/g, "\n  ")}`);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
