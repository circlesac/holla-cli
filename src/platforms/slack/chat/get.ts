import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const getCommand = defineCommand({
  meta: { name: "get", description: "Get a single message by timestamp" },
  args: {
    ...commonArgs,
    channel: {
      type: "string",
      description: "Channel name or ID (e.g. #general or C01234567)",
      required: true,
    },
    ts: {
      type: "string",
      description: "Message timestamp (e.g. 1234567890.123456)",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      const result = await client.conversations.history({
        channel,
        latest: args.ts,
        oldest: args.ts,
        inclusive: true,
        limit: 1,
      });

      const msg = result.messages?.[0];
      if (!msg) {
        console.error("\x1b[31m✗\x1b[0m Message not found");
        process.exit(1);
      }

      const format = getOutputFormat(args);
      const data = {
        ts: msg.ts ?? "",
        user: msg.user ?? "",
        text: msg.text ?? "",
      };

      if (format === "json") {
        printOutput(data, format);
      } else {
        printOutput(data, format);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
