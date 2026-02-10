import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List user groups" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.usergroups.list();

      const groups = ((result.usergroups as Record<string, unknown>[] | undefined) ?? []).map(
        (g) => ({
          id: g.id ?? "",
          name: g.name ?? "",
          handle: g.handle ?? "",
          description: g.description ?? "",
        }),
      );

      printOutput(groups, getOutputFormat(args), [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "handle", label: "Handle" },
        { key: "description", label: "Description" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
