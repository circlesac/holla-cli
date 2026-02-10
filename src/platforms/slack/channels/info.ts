import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const infoCommand = defineCommand({
  meta: { name: "info", description: "Get channel information" },
  args: {
    ...commonArgs,
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel, workspace);

      const result = await client.conversations.info({ channel: channelId });
      const ch = result.channel as Record<string, unknown> | undefined;

      if (!ch) {
        console.error("\x1b[31m✗\x1b[0m Channel not found");
        process.exit(1);
      }

      const info: Record<string, unknown> = {
        id: ch.id,
        name: ch.name,
        is_channel: ch.is_channel,
        is_private: ch.is_private,
        is_archived: ch.is_archived,
        created: ch.created,
        creator: ch.creator,
        topic: (ch.topic as { value?: string })?.value ?? "",
        purpose: (ch.purpose as { value?: string })?.value ?? "",
        num_members: ch.num_members,
      };

      printOutput(info, getOutputFormat(args));
    } catch (error) {
      handleError(error);
    }
  },
});
