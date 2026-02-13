import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser, resolveUserName, resolveGroup } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const removeMemberCommand = defineCommand({
  meta: { name: "remove-member", description: "Remove a member from a user group" },
  args: {
    ...commonArgs,
    group: {
      type: "string",
      description: "User group ID or handle",
      required: true,
    },
    user: {
      type: "string",
      description: "User ID or @username to remove",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const group = await resolveGroup(client, args.group);
      const userId = await resolveUser(client, args.user, workspace);

      const result = await client.usergroups.users.list({ usergroup: group.id });
      const current = (result.users as string[]) ?? [];

      const userName = await resolveUserName(client, userId, workspace);

      if (!current.includes(userId)) {
        console.log(`@${userName} is not a member of ${group.name} (@${group.handle})`);
        return;
      }

      const updated = current.filter((id) => id !== userId);
      await client.usergroups.users.update({
        usergroup: group.id,
        users: updated.join(","),
      });

      console.log(`\x1b[32m✓\x1b[0m Removed @${userName} from ${group.name} (@${group.handle})`);
    } catch (error) {
      handleError(error);
    }
  },
});
