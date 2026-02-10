import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const snoozeCommand = defineCommand({
  meta: { name: "snooze", description: "Snooze DND for a number of minutes" },
  args: {
    ...commonArgs,
    minutes: {
      type: "string",
      description: "Number of minutes to snooze",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const numMinutes = parseInt(args.minutes, 10);
      if (isNaN(numMinutes) || numMinutes <= 0) {
        console.error("\x1b[31m✗\x1b[0m Minutes must be a positive number");
        process.exit(1);
      }

      await client.dnd.setSnooze({
        num_minutes: numMinutes,
      });

      console.log(
        `\x1b[32m✓\x1b[0m DND snoozed for ${numMinutes} minutes`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
