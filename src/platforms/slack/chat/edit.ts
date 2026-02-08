import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

export const editCommand = defineCommand({
  meta: { name: "edit", description: "Edit an existing message" },
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
    ts: {
      type: "string",
      description: "Timestamp of the message to edit",
      required: true,
    },
    message: {
      type: "string",
      description: "New message text",
      required: true,
      alias: "m",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel);

      const result = await client.chat.update({
        channel,
        ts: args.ts,
        text: args.message,
      });

      console.log(`\x1b[32m✓\x1b[0m Message updated (ts: ${result.ts})`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
