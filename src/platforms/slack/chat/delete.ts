import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const deleteCommand = defineCommand({
  meta: { name: "delete", description: "Delete a message" },
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
    ts: {
      type: "string",
      description: "Timestamp of the message to delete",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      await client.chat.delete({ channel, ts: args.ts });

      console.log(`\x1b[32m✓\x1b[0m Message deleted (ts: ${args.ts})`);
    } catch (error) {
      handleError(error);
    }
  },
});
