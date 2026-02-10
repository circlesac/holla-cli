import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const permalinkCommand = defineCommand({
  meta: { name: "permalink", description: "Get a permalink URL for a message" },
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
      description: "Timestamp of the message",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      const result = await client.chat.getPermalink({ channel, message_ts: args.ts });

      console.log(result.permalink);
    } catch (error) {
      handleError(error);
    }
  },
});
