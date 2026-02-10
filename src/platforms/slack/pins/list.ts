import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List pinned items in a channel" },
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

      const result = await client.pins.list({ channel: channelId });

      const items = ((result.items as Record<string, unknown>[] | undefined) ?? []).map(
        (item) => {
          const message = item.message as Record<string, unknown> | undefined;
          return {
            type: item.type ?? "",
            created: item.created ?? "",
            user: message?.user ?? "",
            ts: message?.ts ?? "",
            text: message?.text ?? "",
          };
        },
      );

      printOutput(items, getOutputFormat(args), [
        { key: "type", label: "Type" },
        { key: "ts", label: "Timestamp" },
        { key: "user", label: "User" },
        { key: "text", label: "Text" },
        { key: "created", label: "Pinned At" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
