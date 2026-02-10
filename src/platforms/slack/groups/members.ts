import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const membersCommand = defineCommand({
  meta: { name: "members", description: "List members of a user group" },
  args: {
    ...commonArgs,
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
      handleError(error);
    }
  },
});
