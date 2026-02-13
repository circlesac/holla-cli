import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const accessDeleteCommand = defineCommand({
  meta: { name: "access-delete", description: "Remove access to a canvas" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID",
      required: true,
    },
    channels: {
      type: "string",
      description: "Comma-separated channel IDs or #names to remove",
    },
    users: {
      type: "string",
      description: "Comma-separated user IDs or @usernames to remove",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: Record<string, unknown> = {
        canvas_id: args.canvas,
      };

      if (args.channels) {
        const channelIds = await Promise.all(
          args.channels.split(",").map((c) => resolveChannel(client, c.trim(), workspace)),
        );
        params.channel_ids = channelIds;
      }

      if (args.users) {
        const userIds = await Promise.all(
          args.users.split(",").map((u) => resolveUser(client, u.trim(), workspace)),
        );
        params.user_ids = userIds;
      }

      await client.apiCall("canvases.access.delete", params);

      console.log(`\x1b[32m✓\x1b[0m Access removed on canvas ${args.canvas}`);
    } catch (error) {
      handleError(error);
    }
  },
});
