import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const deleteCommand = defineCommand({
  meta: { name: "delete", description: "Delete a canvas (permanent)" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      await client.apiCall("canvases.delete", {
        canvas_id: args.canvas,
      });

      console.log(`\x1b[32m✓\x1b[0m Canvas ${args.canvas} deleted`);
    } catch (error) {
      handleError(error);
    }
  },
});
