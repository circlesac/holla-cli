import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";

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
    message: {
      type: "string",
      description: "Message text",
      required: true,
      alias: "m",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel);
      const user = await resolveUser(client, args.user);

      const result = await client.chat.postEphemeral({
        channel,
        user,
        text: args.message,
      });

      console.log(`\x1b[32m✓\x1b[0m Ephemeral message sent (ts: ${result.message_ts})`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
