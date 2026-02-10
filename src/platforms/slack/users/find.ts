import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";

export const findCommand = defineCommand({
  meta: { name: "find", description: "Find a user by email" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    email: {
      type: "string",
      description: "Email address to look up",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.users.lookupByEmail({ email: args.email });

      if (args.json) {
        console.log(JSON.stringify(result.user, null, 2));
      } else {
        const user = result.user as {
          id?: string;
          name?: string;
          real_name?: string;
          profile?: { display_name?: string; email?: string };
        };
        console.log(`ID:            ${user.id ?? ""}`);
        console.log(`Name:          ${user.name ?? ""}`);
        console.log(`Real Name:     ${user.real_name ?? ""}`);
        console.log(`Display Name:  ${user.profile?.display_name ?? ""}`);
        console.log(`Email:         ${user.profile?.email ?? ""}`);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
