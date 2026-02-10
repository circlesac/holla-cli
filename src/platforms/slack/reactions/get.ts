import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const getCommand = defineCommand({
  meta: { name: "get", description: "Get reactions for a message" },
  args: {
    ...commonArgs,
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
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const channel = await resolveChannel(client, args.channel, workspace);

      const result = await client.reactions.get({
        channel,
        timestamp: args.ts,
        full: true,
      });

      const message = result.message as {
        reactions?: { name: string; count: number; users: string[] }[];
      };
      const reactions = (message?.reactions ?? []).map((r) => ({
        name: r.name,
        count: r.count,
        users: r.users.join(", "),
      }));

      printOutput(reactions, getOutputFormat(args), [
        { key: "name", label: "Emoji" },
        { key: "count", label: "Count" },
        { key: "users", label: "Users" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
