import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveGroup } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const enableCommand = defineCommand({
  meta: { name: "enable", description: "Enable a user group" },
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
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const group = await resolveGroup(client, args.group);

      await client.usergroups.enable({
        usergroup: group.id,
      });

      console.log(
        `\x1b[32m✓\x1b[0m ${group.name} (@${group.handle}) enabled`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
