import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

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
    message: {
      type: "string",
      description: "Message text",
      required: true,
      alias: "m",
    },
    at: {
      type: "string",
      description: "Unix timestamp for when to send the message",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel);

      const postAt = Number(args.at);
      if (Number.isNaN(postAt)) {
        console.error("\x1b[31m✗\x1b[0m --at must be a valid unix timestamp");
        process.exit(1);
      }

      const result = await client.chat.scheduleMessage({
        channel,
        text: args.message,
        post_at: postAt,
      });

      console.log(
        `\x1b[32m✓\x1b[0m Message scheduled (id: ${result.scheduled_message_id}, post_at: ${result.post_at})`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
