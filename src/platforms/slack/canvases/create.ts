import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const createCommand = defineCommand({
  meta: { name: "create", description: "Create a canvas" },
  args: {
    ...commonArgs,
    title: {
      type: "string",
      description: "Canvas title",
    },
    markdown: {
      type: "string",
      description: "Canvas content in markdown format",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const authInfo = await client.auth.test();
      const teamId = authInfo.team_id ?? "";
      const domain = (authInfo.url ?? "").replace(/^https?:\/\//, "").replace(/\.slack\.com\/?$/, "");

      const params: Record<string, unknown> = {};
      if (args.title) params.title = args.title;
      if (args.markdown) {
        params.document_content = {
          type: "markdown",
          markdown: args.markdown,
        };
      }

      const result = await client.apiCall("canvases.create", params);
      const canvasId = (result as { canvas_id?: string }).canvas_id ?? "unknown";
      const url = domain && teamId ? `https://${domain}.slack.com/docs/${teamId}/${canvasId}` : "";

      const format = getOutputFormat(args);
      if (format === "json") {
        printOutput([{ canvas_id: canvasId, title: args.title ?? "", url }], format, [
          { key: "canvas_id", label: "Canvas ID" },
          { key: "title", label: "Title" },
          { key: "url", label: "URL" },
        ]);
      } else {
        console.log(`\x1b[32m✓\x1b[0m Canvas created: ${args.title ?? "(untitled)"} (${canvasId})`);
        if (url) console.log(`  ${url}`);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
