import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const createCommand = defineCommand({
  meta: { name: "create", description: "Create a user group" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    name: {
      type: "string",
      description: "Group name",
      required: true,
    },
    handle: {
      type: "string",
      description: "Group handle (mention name)",
    },
    description: {
      type: "string",
      description: "Group description",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: {
        name: string;
        handle?: string;
        description?: string;
      } = { name: args.name };

      if (args.handle) params.handle = args.handle;
      if (args.description) params.description = args.description;

      const result = await client.usergroups.create(params);

      const group = result.usergroup as { id?: string; name?: string } | undefined;

      console.log(
        `\x1b[32m✓\x1b[0m User group created: ${group?.name ?? args.name} (${group?.id ?? "unknown"})`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
