import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const accessSetCommand = defineCommand({
  meta: { name: "access-set", description: "Set access level for a canvas" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID",
      required: true,
    },
    level: {
      type: "string",
      description: "Access level: read or write",
      required: true,
    },
    channels: {
      type: "string",
      description: "Comma-separated channel IDs or #names",
    },
    users: {
      type: "string",
      description: "Comma-separated user IDs or @usernames",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      if (args.level !== "read" && args.level !== "write") {
        throw new Error(`Invalid access level: ${args.level}. Must be "read" or "write"`);
      }

      const params: Record<string, unknown> = {
        canvas_id: args.canvas,
        access_level: args.level,
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

      await client.apiCall("canvases.access.set", params);

      console.log(
        `\x1b[32m✓\x1b[0m Access set to "${args.level}" on canvas ${args.canvas}`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
