import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const createCommand = defineCommand({
  meta: { name: "create", description: "Create a new channel" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    name: {
      type: "string",
      description: "Channel name",
      required: true,
    },
    private: {
      type: "boolean",
      description: "Create as a private channel",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.conversations.create({
        name: args.name,
        is_private: args.private ?? false,
      });

      const ch = result.channel as { id?: string; name?: string } | undefined;

      console.log(
        `\x1b[32m✓\x1b[0m Channel created: #${ch?.name ?? args.name} (${ch?.id ?? "unknown"})`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
