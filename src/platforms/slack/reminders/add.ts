import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";

export const addCommand = defineCommand({
  meta: { name: "add", description: "Add a reminder" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    text: {
      type: "string",
      description: "Reminder text",
      required: true,
    },
    time: {
      type: "string",
      description: "When to remind (Unix timestamp or natural language, e.g. 'in 5 minutes')",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace, true);
      const client = createSlackClient(token);

      const result = await client.reminders.add({
        text: args.text,
        time: args.time,
      });

      const reminder = result.reminder as { id?: string } | undefined;

      console.log(
        `\x1b[32m✓\x1b[0m Reminder added (id: ${reminder?.id ?? "unknown"})`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
