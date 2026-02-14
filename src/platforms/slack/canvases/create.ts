import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { resolveChannel } from "../resolve.ts";
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
    channel: {
      type: "string",
      description: "Share canvas as read-only to channel(s) (comma-separated #names or IDs)",
    },
  },
  async run({ args }) {
    try {
      const { token, workspace } = await getToken(args.workspace);
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

      // Auto-share to channels if specified
      if (args.channel) {
        const channelIds = await Promise.all(
          args.channel.split(",").map((c: string) => resolveChannel(client, c.trim(), workspace)),
        );
        await client.apiCall("canvases.access.set", {
          canvas_id: canvasId,
          access_level: "read",
          channel_ids: channelIds,
        });
      }

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
        if (args.channel) console.log(`  Shared as read-only to: ${args.channel}`);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
