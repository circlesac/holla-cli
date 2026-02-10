import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const updateCommand = defineCommand({
  meta: { name: "update", description: "Update a user group" },
  args: {
    ...commonArgs,
    group: {
      type: "string",
      description: "User group ID",
      required: true,
    },
    name: {
      type: "string",
      description: "New group name",
    },
    handle: {
      type: "string",
      description: "New group handle",
    },
    description: {
      type: "string",
      description: "New group description",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: {
        usergroup: string;
        name?: string;
        handle?: string;
        description?: string;
      } = { usergroup: args.group };

      if (args.name) params.name = args.name;
      if (args.handle) params.handle = args.handle;
      if (args.description) params.description = args.description;

      await client.usergroups.update(params);

      console.log(
        `\x1b[32m✓\x1b[0m User group ${args.group} updated`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
