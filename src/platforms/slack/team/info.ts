import { defineCommand } from "citty";
import { getToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { printOutput, getOutputFormat } from "../../../lib/output.ts";
import { handleError } from "../../../lib/errors.ts";
import { commonArgs } from "../../../lib/args.ts";

export const infoCommand = defineCommand({
  meta: { name: "info", description: "Get team information" },
  args: {
    ...commonArgs,
  },
  async run({ args }) {
    try {
      const { token } = await getToken(args.workspace);
      const client = createSlackClient(token);

      const result = await client.team.info();

      const team = result.team as Record<string, unknown> | undefined;

      if (!team) {
        console.error("\x1b[31m✗\x1b[0m Team not found");
        process.exit(1);
      }

      const info: Record<string, unknown> = {
        id: team.id,
        name: team.name,
        domain: team.domain,
        email_domain: team.email_domain,
        icon: (team.icon as { image_68?: string })?.image_68 ?? "",
      };

      printOutput(info, getOutputFormat(args));
    } catch (error) {
      handleError(error);
    }
  },
});
