import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

export const removeCommand = defineCommand({
  meta: { name: "remove", description: "Remove a reaction from a message" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    ts: {
      type: "string",
      description: "Message timestamp",
      required: true,
    },
    name: {
      type: "string",
      description: "Emoji name (without colons)",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const channel = await resolveChannel(client, args.channel);

      await client.reactions.remove({
        channel,
        timestamp: args.ts,
        name: args.name,
      });

      console.log(`\x1b[32m\u2713\x1b[0m Reaction :${args.name}: removed`);
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
