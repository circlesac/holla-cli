import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

export const uploadCommand = defineCommand({
  meta: { name: "upload", description: "Upload a file to Slack" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    channel: {
      type: "string",
      description: "Channel ID or #name to share the file in",
    },
    file: {
      type: "string",
      description: "Path to the file to upload",
      required: true,
    },
    title: {
      type: "string",
      description: "Title of the file",
    },
    message: {
      type: "string",
      description: "Initial comment for the file",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);

      let channelId: string | undefined;
      if (args.channel) {
        channelId = await resolveChannel(client, args.channel);
      }

      const bunFile = Bun.file(args.file);
      const content = await bunFile.arrayBuffer();
      const filename = args.file.split("/").pop() ?? args.file;

      await client.filesUploadV2({
        channel_id: channelId,
        file: Buffer.from(content),
        filename,
        title: args.title,
        initial_comment: args.message,
      });

      console.log(
        `\x1b[32m✓\x1b[0m File uploaded: ${filename}${channelId ? ` to channel ${channelId}` : ""}`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
