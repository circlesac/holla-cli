import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const setMembersCommand = defineCommand({
  meta: { name: "set-members", description: "Set members of a user group" },
  args: {
    ...commonArgs,
    group: {
      type: "string",
      description: "User group ID",
      required: true,
    },
    users: {
      type: "string",
      description: "Comma-separated user IDs",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.usergroups.users.update({
        usergroup: args.group,
        users: args.users,
      });

      console.log(
        `\x1b[32m✓\x1b[0m Members updated for user group ${args.group}`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
