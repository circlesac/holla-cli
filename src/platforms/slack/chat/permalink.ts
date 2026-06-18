import { defineCommand } from "citty";
import { WebClient } from "@slack/web-api";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

// Slack's chat.postMessage does NOT return a permalink — only channel + ts. Fetch it
// with a follow-up chat.getPermalink so callers (send/reply) can surface a clickable
// link. Thread replies need this: a hand-built /archives/<ch>/p<ts> URL omits the
// ?thread_ts=… the permalink carries, so it won't open in-thread. Best-effort: returns
// undefined on failure rather than breaking the send that already succeeded.
export async function fetchPermalink(client: WebClient, channel: string, ts: string): Promise<string | undefined> {
  try {
    const result = await client.chat.getPermalink({ channel, message_ts: ts });
    return result.permalink ?? undefined;
  } catch {
    return undefined;
  }
}

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
