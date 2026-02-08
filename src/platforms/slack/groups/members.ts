import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const membersCommand = defineCommand({
  meta: { name: "members", description: "List members of a user group" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    group: {
      type: "string",
      description: "User group ID",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.usergroups.users.list({
        usergroup: args.group,
      });

      const users = (result.users as string[] | undefined) ?? [];

      const rows = users.map((id) => ({ user_id: id }));

      printOutput(rows, getOutputFormat(args), [
        { key: "user_id", label: "User ID" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
