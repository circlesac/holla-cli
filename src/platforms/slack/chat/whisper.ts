import { defineCommand } from "citty";
import { markdownToBlocks } from "@circlesac/mack";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel, resolveUser } from "../resolve.ts";
import { normalizeSlackText } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";

export const whisperCommand = defineCommand({
  meta: { name: "whisper", description: "Send an ephemeral message visible only to one user" },
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
    user: {
      type: "string",
      description: "User name or ID (e.g. @john or U01234567)",
      required: true,
    },
    text: {
      type: "string",
      description: "Message text or markdown",
      required: true,
    },
    thread: {
      type: "string",
      description: "Thread timestamp to reply in (e.g. 1234567890.123456)",
      alias: "t",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel, workspace);
      const user = await resolveUser(client, args.user, workspace);

      const text = normalizeSlackText(args.text as string);
      const blocks = await markdownToBlocks(text);
      const thread_ts = args.thread || undefined;
      const result = await client.chat.postEphemeral({
        channel,
        user,
        text,
        blocks,
        thread_ts,
      });

      console.log(`\x1b[32m✓\x1b[0m Ephemeral message sent (ts: ${result.message_ts})`);
    } catch (error) {
      handleError(error);
    }
  },
});
