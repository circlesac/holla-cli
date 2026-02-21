import { defineCommand } from "citty";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

function createTurndown(): TurndownService {
  const td = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced" });
  td.use(gfm);

  // Slack canvas tables use <td> for all cells (no <thead>/<th>).
  // Treat the first <tr> as a header row and convert to GFM table.
  td.addRule("slackTable", {
    filter: "table",
    replacement(_content, node) {
      const rows = Array.from(node.querySelectorAll("tr"));
      if (rows.length === 0) return "";

      const extractRow = (tr: Element): string[] =>
        Array.from(tr.querySelectorAll("td")).map((td) =>
          td.textContent?.trim().replace(/\|/g, "\\|") ?? "",
        );

      const header = extractRow(rows[0]);
      const separator = header.map(() => "---");
      const body = rows.slice(1).map(extractRow);

      const lines = [
        `| ${header.join(" | ")} |`,
        `| ${separator.join(" | ")} |`,
        ...body.map((row) => `| ${row.join(" | ")} |`),
      ];
      return `\n\n${lines.join("\n")}\n\n`;
    },
  });

  return td;
}

function parseCanvasId(input: string): string {
  // Accept full Slack URLs: https://workspace.slack.com/docs/TEAM_ID/CANVAS_ID
  const match = input.match(/^https?:\/\/[^/]+\.slack\.com\/docs\/[^/]+\/([A-Z][A-Z0-9]+)/);
  return match?.[1] ?? input;
}

export const readCommand = defineCommand({
  meta: { name: "read", description: "Read a canvas" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID or Slack URL",
      required: true,
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);
      const canvasId = parseCanvasId(args.canvas);

      const result = await client.files.info({ file: canvasId });
      const f = result.file as Record<string, unknown> | undefined;

      if (!f) {
        console.error("\x1b[31m✗\x1b[0m Canvas not found");
        process.exit(1);
      }

      const downloadUrl = (f.url_private_download ?? f.url_private) as string | undefined;
      if (!downloadUrl) {
        console.error("\x1b[31m✗\x1b[0m No download URL available");
        process.exit(1);
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const td = createTurndown();
      const markdown = td.turndown(html);

      const format = getOutputFormat(args);
      if (format === "json") {
        printOutput(
          {
            id: f.id,
            title: f.title,
            markdown,
            created: f.created,
            updated: f.updated,
          },
          format,
        );
      } else {
        console.log(markdown);
      }
    } catch (error) {
      handleError(error);
    }
  },
});
