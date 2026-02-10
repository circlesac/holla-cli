import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const addCommand = defineCommand({
  meta: { name: "add", description: "Add a reminder" },
  args: {
    ...commonArgs,
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
      const { token } = await getToken(args.workspace);
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
      handleError(error);
    }
  },
});
