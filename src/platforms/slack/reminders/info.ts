import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const infoCommand = defineCommand({
  meta: { name: "info", description: "Get reminder information" },
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

      const result = await client.reminders.info({
        reminder: args.reminder,
      });

      const r = result.reminder as Record<string, unknown> | undefined;

      if (!r) {
        console.error("\x1b[31m✗\x1b[0m Reminder not found");
        process.exit(1);
      }

      const info: Record<string, unknown> = {
        id: r.id,
        text: r.text,
        creator: r.creator,
        user: r.user,
        time: r.time,
        complete_ts: r.complete_ts,
        recurring: r.recurring,
      };

      printOutput(info, getOutputFormat(args));
    } catch (error) {
      handleError(error);
    }
  },
});
