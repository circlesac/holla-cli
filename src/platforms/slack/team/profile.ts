import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const profileCommand = defineCommand({
  meta: { name: "profile", description: "Get team profile fields" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.team.profile.get();

      const profile = result.profile as { fields?: Record<string, unknown>[] } | undefined;
      const fields = profile?.fields ?? [];

      const rows = fields.map((f) => ({
        id: f.id ?? "",
        label: f.label ?? "",
        type: f.type ?? "",
        hint: f.hint ?? "",
        ordering: f.ordering ?? "",
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "label", label: "Label" },
        { key: "type", label: "Type" },
        { key: "hint", label: "Hint" },
        { key: "ordering", label: "Order" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
