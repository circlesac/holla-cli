import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List reminders" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    json: { type: "boolean", description: "Output as JSON" },
    plain: { type: "boolean", description: "Output as plain text" },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.reminders.list();

      const reminders = ((result.reminders as Record<string, unknown>[] | undefined) ?? []).map(
        (r) => ({
          id: r.id ?? "",
          text: r.text ?? "",
          time: r.time ?? "",
          complete_ts: r.complete_ts ?? "",
        }),
      );

      printOutput(reminders, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "text", label: "Text" },
        { key: "time", label: "Time" },
        { key: "complete_ts", label: "Completed" },
      ]);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
