import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";
import { handleError } from "../../../lib/errors.ts";

export const presenceCommand = defineCommand({
  meta: { name: "presence", description: "Get user presence status" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    user: {
      type: "string",
      description: "User ID or @name",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const userId = await resolveUser(client, args.user, workspace);
      const result = await client.users.getPresence({ user: userId });

      if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Presence: ${result.presence ?? "unknown"}`);
        if (result.online !== undefined) {
          console.log(`Online:   ${result.online}`);
        }
        if (result.auto_away !== undefined) {
          console.log(`Auto Away: ${result.auto_away}`);
        }
      }
    } catch (error) {
      handleError(error);
    }
  },
});
