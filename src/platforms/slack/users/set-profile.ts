import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const setProfileCommand = defineCommand({
  meta: { name: "set-profile", description: "Set user profile fields" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    "display-name": {
      type: "string",
      description: "Display name",
    },
    "status-text": {
      type: "string",
      description: "Status text",
    },
    "status-emoji": {
      type: "string",
      description: "Status emoji (e.g. :house_with_garden:)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);

      const profile: Record<string, string> = {};

      if (args["display-name"] !== undefined) {
        profile.display_name = args["display-name"];
      }
      if (args["status-text"] !== undefined) {
        profile.status_text = args["status-text"];
      }
      if (args["status-emoji"] !== undefined) {
        profile.status_emoji = args["status-emoji"];
      }

      if (Object.keys(profile).length === 0) {
        console.error(
          "\x1b[31m\u2717\x1b[0m At least one profile field is required: --display-name, --status-text, --status-emoji",
        );
        process.exit(1);
      }

      await client.users.profile.set({ profile });

      console.log("\x1b[32m\u2713\x1b[0m Profile updated");
    } catch (error) {
      console.error(
        `\x1b[31m\u2717\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
