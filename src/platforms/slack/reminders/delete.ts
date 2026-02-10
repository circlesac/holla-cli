import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const deleteCommand = defineCommand({
  meta: { name: "delete", description: "Delete a reminder" },
  args: {
    ...commonArgs,
    reminder: {
      type: "string",
      description: "Reminder ID",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.reminders.delete({
        reminder: args.reminder,
      });

      console.log(
        `\x1b[32m✓\x1b[0m Reminder ${args.reminder} deleted`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
