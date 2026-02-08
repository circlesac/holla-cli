import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List custom emoji" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.emoji.list();

      const emojiMap = (result.emoji as Record<string, string> | undefined) ?? {};

      const rows = Object.entries(emojiMap).map(([name, url]) => ({
        name,
        url,
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "name", label: "Name" },
        { key: "url", label: "URL" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
