import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const endCommand = defineCommand({
  meta: { name: "end", description: "End DND mode" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.dnd.endDnd();

      console.log(
        `\x1b[32m✓\x1b[0m DND mode ended`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
