import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const kickCommand = defineCommand({
  meta: { name: "kick", description: "Remove a user from a channel" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    user: {
      type: "string",
      description: "User ID or @name",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);
      const userId = await resolveUser(client, args.user, workspace);

      await client.conversations.kick({
        channel: channelId,
        user: userId,
      });

      console.log("\x1b[32m✓\x1b[0m User removed from channel");
    } catch (error) {
      handleError(error);
    }
  },
});
