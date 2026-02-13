import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const sectionsCommand = defineCommand({
  meta: { name: "sections", description: "Look up sections in a canvas" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID",
      required: true,
    },
    contains: {
      type: "string",
      description: "Filter sections containing this text",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const criteria: Record<string, unknown> = {};
      if (args.contains) {
        criteria.contains_text = args.contains;
      }

      const result = await client.apiCall("canvases.sections.lookup", {
        canvas_id: args.canvas,
        criteria,
      });

      const sections = ((result as { sections?: unknown[] }).sections ?? []) as Array<{
        id?: string;
        type?: string;
      }>;

      printOutput(sections, getOutputFormat(args), [
        { key: "id", label: "Section ID" },
        { key: "type", label: "Type" },
      ]);
    } catch (error) {
      handleError(error);
    }
  },
});
