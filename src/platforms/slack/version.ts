import { defineCommand } from "citty";
import { getToken } from "../../lib/credentials.ts";
import { createSlackClient } from "./client.ts";

export const versionCommand = defineCommand({
  meta: {
    name: "version",
    description: "Show Slack connection info",
  },
  args: {
    workspace: {
      type: "string",
      description: "Workspace name",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const result = await client.auth.test();

      console.log(`Workspace:  ${result.team}`);
      console.log(`Team ID:    ${result.team_id}`);
      console.log(`User:       ${result.user}`);
      console.log(`User ID:    ${result.user_id}`);
      console.log(`URL:        ${result.url}`);
      console.log(`Profile:    ${workspace}`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
