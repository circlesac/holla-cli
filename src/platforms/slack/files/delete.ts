import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const deleteCommand = defineCommand({
  meta: { name: "delete", description: "Delete a file" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    file: {
      type: "string",
      description: "File ID",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.files.delete({ file: args.file });

      console.log(`\x1b[32m✓\x1b[0m File deleted: ${args.file}`);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
