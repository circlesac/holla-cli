import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const listCommand = defineCommand({
  meta: { name: "list", description: "List custom emoji" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.emoji.list();

      const emojiMap = (result.emoji as Record<string, string> | undefined) ?? {};

      const rows = Object.entries(emojiMap).map(([name, url]) => ({
        name,
        url,
      }));

      printOutput(rows, getOutputFormat(args), [
        { key: "name", label: "Name" },
        { key: "url", label: "URL" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
