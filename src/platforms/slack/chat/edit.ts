import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const editCommand = defineCommand({
  meta: { name: "edit", description: "Edit an existing message" },
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
      description: "Timestamp of the message to edit",
      required: true,
    },
    text: {
      type: "string",
      description: "New message text or markdown",
      required: true,
      alias: "t",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);

      const text = normalizeSlackText(args.text as string);
      const blocks = await markdownToBlocks(text);
      const result = await client.chat.update({
        channel,
        ts: args.ts,
        text,
        blocks,
      });

      console.log(`\x1b[32m✓\x1b[0m Message updated (ts: ${result.ts})`);
    } catch (error) {
      handleError(error);
    }
  },
});
