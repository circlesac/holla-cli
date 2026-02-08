import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const endCommand = defineCommand({
  meta: { name: "end", description: "End DND mode" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);

      await client.dnd.endDnd();

      console.log(
        `\x1b[32m✓\x1b[0m DND mode ended`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
