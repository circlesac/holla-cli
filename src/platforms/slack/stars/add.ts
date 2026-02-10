import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";

export const addCommand = defineCommand({
  meta: { name: "add", description: "Star an item" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID containing the item",
    },
    ts: {
      type: "string",
      description: "Message timestamp to star",
    },
    file: {
      type: "string",
      description: "File ID to star",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.apiCall("stars.add", {
        ...(args.channel ? { channel: args.channel } : {}),
        ...(args.ts ? { timestamp: args.ts } : {}),
        ...(args.file ? { file: args.file } : {}),
      });

      console.log("\x1b[32m✓\x1b[0m Item starred");
    } catch (error) {
      handleError(error);
    }
  },
});
