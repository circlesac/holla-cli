import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const markReadCommand = defineCommand({
  meta: { name: "mark-read", description: "Mark a channel as read" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    ts: {
      type: "string",
      description: "Timestamp to mark as read",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      await client.conversations.mark({
        channel: channelId,
        ts: args.ts,
      });

      console.log("\x1b[32m✓\x1b[0m Channel marked as read");
    } catch (error) {
      handleError(error);
    }
  },
});
