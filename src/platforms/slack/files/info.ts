import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const infoCommand = defineCommand({
  meta: { name: "info", description: "Get file information" },
  args: {
    ...commonArgs,
    file: {
      type: "string",
      description: "File ID",
      required: true,
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

      const info: Record<string, unknown> = {
        id: f.id,
        name: f.name,
        title: f.title,
        filetype: f.filetype,
        size: f.size,
        user: f.user,
        created: f.created,
        timestamp: f.timestamp,
        url_private: f.url_private,
        permalink: f.permalink,
        channels: f.channels,
        groups: f.groups,
        ims: f.ims,
      };

      printOutput(info, getOutputFormat(args));
    } catch (error) {
      handleError(error);
    }
  },
});
