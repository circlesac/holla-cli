import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const removeCommand = defineCommand({
  meta: { name: "remove", description: "Remove a star from an item" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID containing the item",
    },
    ts: {
      type: "string",
      description: "Message timestamp to unstar",
    },
    file: {
      type: "string",
      description: "File ID to unstar",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);

      await client.apiCall("stars.remove", {
        ...(args.channel ? { channel: args.channel } : {}),
        ...(args.ts ? { timestamp: args.ts } : {}),
        ...(args.file ? { file: args.file } : {}),
      });

      console.log("\x1b[32m✓\x1b[0m Star removed");
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
