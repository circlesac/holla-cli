import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List user groups (defaults to groups you belong to)" },
  args: {
    ...commonArgs,
    all: {
      type: "boolean",
      description: "Show all groups in the workspace",
      default: false,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.usergroups.list({
        include_users: !args.all,
      });

      let groups = (result.usergroups as Record<string, unknown>[] | undefined) ?? [];

      if (!args.all) {
        const auth = await client.auth.test();
        const myId = auth.user_id as string;
        groups = groups.filter((g) => {
          const users = g.users as string[] | undefined;
          return users?.includes(myId);
        });
      }

      const data = groups.map((g) => ({
        id: g.id ?? "",
        name: g.name ?? "",
        handle: g.handle ?? "",
        description: g.description ?? "",
      }));

      printOutput(data, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "handle", label: "Handle" },
        { key: "description", label: "Description" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
