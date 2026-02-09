import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveUser } from "../resolve.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const statusCommand = defineCommand({
  meta: { name: "status", description: "Get DND status" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
    user: {
      type: "string",
      description: "User name or ID (e.g. @john or U01234567)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const params: { user?: string } = {};
      if (args.user) {
        params.user = await resolveUser(client, args.user, workspace);
      }

      const result = await client.dnd.info(params);

      const raw = result as unknown as Record<string, unknown>;
      const info: Record<string, unknown> = {
        dnd_enabled: raw.dnd_enabled,
        next_dnd_start_ts: raw.next_dnd_start_ts,
        next_dnd_end_ts: raw.next_dnd_end_ts,
        snooze_enabled: raw.snooze_enabled,
        snooze_endtime: raw.snooze_endtime,
        snooze_remaining: raw.snooze_remaining,
      };

      printOutput(info, getOutputFormat(args));
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
