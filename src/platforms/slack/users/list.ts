import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List users" },
  args: {
    ...commonArgs,
    limit: {
      type: "string",
      description: "Number of users per page (default 1000, max 1000)",
    },
    cursor: {
      type: "string",
      description: "Pagination cursor (start from a specific page)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const limit = args.limit ? parseInt(args.limit as string, 10) : 1000;
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
      } while (cursor);

      printOutput(users, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "real_name", label: "Real Name" },
        { key: "display_name", label: "Display Name" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
