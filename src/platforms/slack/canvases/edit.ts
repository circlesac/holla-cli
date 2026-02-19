import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { sanitizeCanvasMarkdown } from "../text.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const editCommand = defineCommand({
  meta: { name: "edit", description: "Edit a canvas" },
  args: {
    ...commonArgs,
    canvas: {
      type: "string",
      description: "Canvas ID",
      required: true,
    },
    operation: {
      type: "string",
      description:
        "Operation: insert_at_start, insert_at_end, insert_before, insert_after, replace, delete",
      required: true,
    },
    markdown: {
      type: "string",
      description: "Markdown content for the operation",
    },
    stdio: {
      type: "boolean",
      description: "Read markdown content from stdin",
      default: false,
    },
    "section-id": {
      type: "string",
      description: "Section ID (for insert_before, insert_after, replace, delete)",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const validOps = [
        "insert_at_start",
        "insert_at_end",
        "insert_before",
        "insert_after",
        "replace",
        "delete",
      ];
      if (!validOps.includes(args.operation)) {
        throw new Error(`Invalid operation: ${args.operation}. Valid: ${validOps.join(", ")}`);
      }

      const change: Record<string, unknown> = {
        operation: args.operation,
      };

      let markdown = args.markdown as string | undefined;
      if (!markdown && args.stdio) {
        markdown = (await Bun.stdin.text()).trimEnd() || undefined;
      }

      if (markdown) {
        const sanitized = sanitizeCanvasMarkdown(markdown);
        if (sanitized.modified) {
          console.error(
            "\x1b[33m⚠\x1b[0m Markdown adjusted: bullet sub-items under numbered lists were converted to numbered sub-items (Slack Canvas API limitation)",
          );
        }
        change.document_content = {
          type: "markdown",
          markdown: sanitized.markdown,
        };
      }

      if (args["section-id"]) {
        change.section_id = args["section-id"];
      }

      await client.apiCall("canvases.edit", {
        canvas_id: args.canvas,
        changes: [change],
      });

      console.log(`\x1b[32m✓\x1b[0m Canvas ${args.canvas} updated (${args.operation})`);
    } catch (error) {
      handleError(error);
    }
  },
});
