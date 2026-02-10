import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";

export const setPresenceCommand = defineCommand({
  meta: { name: "set-presence", description: "Set user presence" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    presence: {
      type: "string",
      description: 'Presence status: "auto" or "away"',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const presence = args.presence;
      if (presence !== "auto" && presence !== "away") {
        console.error(
          '\x1b[31m\u2717\x1b[0m Presence must be "auto" or "away"',
        );
        process.exit(1);
      }

      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.users.setPresence({ presence });

      console.log(`\x1b[32m\u2713\x1b[0m Presence set to "${presence}"`);
    } catch (error) {
      handleError(error);
    }
  },
});
