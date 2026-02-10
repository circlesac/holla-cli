import { defineCommand } from "citty";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { handleError } from "../../../lib/errors.ts";

export const downloadCommand = defineCommand({
  meta: { name: "download", description: "Download a file from Slack" },
  args: {
    workspace: { type: "string", description: "Workspace name", alias: "w" },
    file: {
      type: "string",
      description: "File ID",
      required: true,
    },
    output: {
      type: "string",
      description: "Output path (default: current directory with original filename)",
      alias: "o",
    },
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.files.info({ file: args.file });
      const f = result.file as Record<string, unknown> | undefined;

      if (!f) {
        console.error("\x1b[31m✗\x1b[0m File not found");
        process.exit(1);
      }

      const downloadUrl = (f.url_private_download ?? f.url_private) as
        | string
        | undefined;
      if (!downloadUrl) {
        console.error(
          "\x1b[31m✗\x1b[0m No download URL available for this file",
        );
        process.exit(1);
      }

      const response = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(
          `Download failed: ${response.status} ${response.statusText}`,
        );
      }

      const filename = (f.name as string) ?? args.file;
      const outputPath = args.output ?? join(process.cwd(), filename);
      const buffer = await response.arrayBuffer();

      await writeFile(outputPath, Buffer.from(buffer));

      console.log(
        `\x1b[32m✓\x1b[0m Downloaded: ${outputPath} (${buffer.byteLength} bytes)`,
      );
    } catch (error) {
      handleError(error);
    }
  },
});
