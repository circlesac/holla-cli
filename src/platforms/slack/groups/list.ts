import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List user groups" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.usergroups.list();

      const groups = ((result.usergroups as Record<string, unknown>[] | undefined) ?? []).map(
        (g) => ({
          id: g.id ?? "",
          name: g.name ?? "",
          handle: g.handle ?? "",
          description: g.description ?? "",
        }),
      );

      printOutput(groups, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "handle", label: "Handle" },
        { key: "description", label: "Description" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
