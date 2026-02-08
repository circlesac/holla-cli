import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const membersCommand = defineCommand({
  meta: { name: "members", description: "List channel members" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    channel: {
      type: "string",
      description: "Channel ID or #name",
      required: true,
    },
    limit: {
      type: "string",
      description: "Number of members to return",
    },
    all: {
      type: "boolean",
      description: "Auto-paginate to fetch all members",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const channelId = await resolveChannel(client, args.channel);

      const limit = args.limit ? parseInt(args.limit, 10) : undefined;

      const memberIds: string[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.conversations.members({
          channel: channelId,
          limit,
          cursor,
        });

        for (const id of result.members ?? []) {
          memberIds.push(id);
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      const members = memberIds.map((id) => ({ id }));

      printOutput(members, getOutputFormat(args), [
        { key: "id", label: "Member ID" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
