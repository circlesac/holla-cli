import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const teamCommand = defineCommand({
  meta: { name: "team", description: "Get DND status for multiple users" },
  args: {
    ...commonArgs,
    users: {
      type: "string",
      description: "Comma-separated user IDs",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.dnd.teamInfo({
        users: args.users,
      });

      const users = result.users as Record<string, Record<string, unknown>> | undefined;

      if (!users) {
        console.error("\x1b[31m✗\x1b[0m No DND data returned");
        process.exit(1);
      }

      const rows = Object.entries(users).map(([userId, info]) => ({
        user: userId,
        dnd_enabled: info.dnd_enabled ?? false,
        next_dnd_start_ts: info.next_dnd_start_ts ?? "",
        next_dnd_end_ts: info.next_dnd_end_ts ?? "",
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "user", label: "User" },
        { key: "dnd_enabled", label: "DND Enabled" },
        { key: "next_dnd_start_ts", label: "Next Start" },
        { key: "next_dnd_end_ts", label: "Next End" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
