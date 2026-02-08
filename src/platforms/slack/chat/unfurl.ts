import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";

export const unfurlCommand = defineCommand({
  meta: { name: "unfurl", description: "Provide unfurl data for URLs in a message" },
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
      description: "Timestamp of the message containing the URLs",
      required: true,
    },
    unfurls: {
      type: "string",
      description: "JSON string mapping URLs to unfurl data",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channel = await resolveChannel(client, args.channel);

      let unfurls: Record<string, unknown>;
      try {
        unfurls = JSON.parse(args.unfurls) as Record<string, unknown>;
      } catch {
        console.error("\x1b[31m✗\x1b[0m --unfurls must be valid JSON");
        process.exit(1);
      }

      await client.apiCall("chat.unfurl", { channel, ts: args.ts, unfurls });

      console.log(`\x1b[32m✓\x1b[0m Unfurl data provided (ts: ${args.ts})`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
