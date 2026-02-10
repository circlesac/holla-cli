import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List bookmarks in a channel" },
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

      const result = await client.bookmarks.list({ channel_id: channelId });

      const bookmarks = ((result.bookmarks as Record<string, unknown>[] | undefined) ?? []).map(
        (b) => ({
          id: b.id ?? "",
          title: b.title ?? "",
          link: b.link ?? "",
          type: b.type ?? "",
        }),
      );

      printOutput(bookmarks, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "link", label: "Link" },
        { key: "type", label: "Type" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
