import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveGroup, resolveUserName } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const membersCommand = defineCommand({
  meta: { name: "members", description: "List members of a user group" },
  args: {
    ...commonArgs,
    group: {
      type: "string",
      description: "User group ID or handle",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const group = await resolveGroup(client, args.group);

      const result = await client.usergroups.users.list({
        usergroup: group.id,
      });

      const users = (result.users as string[] | undefined) ?? [];

      const rows = await Promise.all(
        users.map(async (id) => ({
          user_id: id,
          username: await resolveUserName(client, id, workspace),
        })),
      );

      printOutput(rows, getOutputFormat(args), [
        { key: "user_id", label: "User ID" },
        { key: "username", label: "Username" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
