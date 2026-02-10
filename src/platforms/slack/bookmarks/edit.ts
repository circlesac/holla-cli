import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";

export const editCommand = defineCommand({
  meta: { name: "edit", description: "Edit a bookmark" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID",
      required: true,
    },
    bookmark: {
      type: "string",
      description: "Bookmark ID",
      required: true,
    },
    title: {
      type: "string",
      description: "New bookmark title",
    },
    link: {
      type: "string",
      description: "New bookmark URL",
    },
    emoji: {
      type: "string",
      description: "New emoji icon for the bookmark",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.bookmarks.edit({
        channel_id: args.channel,
        bookmark_id: args.bookmark,
        ...(args.title ? { title: args.title } : {}),
        ...(args.link ? { link: args.link } : {}),
        ...(args.emoji ? { emoji: args.emoji } : {}),
      });

      console.log(`\x1b[32m✓\x1b[0m Bookmark updated: ${args.bookmark}`);
    } catch (error) {
      handleError(error);
    }
  },
});
