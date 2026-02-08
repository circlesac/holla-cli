import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List users" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    limit: {
      type: "string",
      description: "Number of users to return (default 20)",
    },
    all: {
      type: "boolean",
      description: "Auto-paginate to fetch all users",
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

      const limit = args.limit ? parseInt(args.limit, 10) : 20;
      const users: Record<string, unknown>[] = [];
      let cursor: string | undefined = args.cursor;

      do {
        const result = await client.users.list({
          limit,
          cursor,
        });

        for (const user of result.members ?? []) {
          users.push({
            id: user.id ?? "",
            name: user.name ?? "",
            real_name: user.real_name ?? "",
            display_name:
              (user.profile as { display_name?: string })?.display_name ?? "",
          });
        }

        cursor = result.response_metadata?.next_cursor || undefined;
      } while (args.all && cursor);

      printOutput(users, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "real_name", label: "Real Name" },
        { key: "display_name", label: "Display Name" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
