import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const addCommand = defineCommand({
  meta: { name: "add", description: "Add a bookmark to a channel" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    title: {
      type: "string",
      description: "Bookmark title",
      required: true,
    },
    link: {
      type: "string",
      description: "Bookmark URL",
      required: true,
    },
    type: {
      type: "string",
      description: "Bookmark type (default: link)",
    },
    emoji: {
      type: "string",
      description: "Emoji icon for the bookmark",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      await client.bookmarks.add({
        channel_id: channelId,
        title: args.title,
        type: (args.type ?? "link") as "link",
        link: args.link,
        ...(args.emoji ? { emoji: args.emoji } : {}),
      });

      console.log(
        `\x1b[32m✓\x1b[0m Bookmark added: "${args.title}" in ${channelId}`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
