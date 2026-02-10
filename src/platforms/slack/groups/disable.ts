import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const disableCommand = defineCommand({
  meta: { name: "disable", description: "Disable a user group" },
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

      await client.usergroups.disable({
        usergroup: args.group,
      });

      console.log(
        `\x1b[32m✓\x1b[0m User group ${args.group} disabled`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
