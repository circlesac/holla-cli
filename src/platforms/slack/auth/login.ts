import { defineCommand } from "citty";
import { storeToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { ensureConfigDir } from "../../../lib/config.ts";

export const loginCommand = defineCommand({
  meta: { name: "login", description: "Authenticate with Slack" },
  args: {
    token: {
      type: "string",
      description: "Slack token (xoxb-... or xoxp-...)",
    },
  },
  async run({ args }) {
    await ensureConfigDir();

    const token = args.token;
    if (!token) {
      console.error(
        "\x1b[31m✗\x1b[0m Please provide a token with --token xoxb-... or --token xoxp-...",
      );
      process.exit(1);
    }

    let tokenType: "bot" | "user";
    if (token.startsWith("xoxb-")) {
      tokenType = "bot";
    } else if (token.startsWith("xoxp-")) {
      tokenType = "user";
    } else {
      console.error(
        "\x1b[31m✗\x1b[0m Token must start with xoxb- (bot) or xoxp- (user)",
      );
      process.exit(1);
    }

    const client = createSlackClient(token);

    try {
      const result = await client.auth.test();
      const workspace = result.team as string;
      const teamUrl = result.url as string;

      const workspaceName = teamUrl
        ? new URL(teamUrl).hostname.split(".")[0]!
        : workspace.toLowerCase().replace(/\s+/g, "-");

      await storeToken(workspaceName, tokenType, token);

      console.log(
        `\x1b[32m✓\x1b[0m Authorized! ${tokenType} token saved for "${workspace}" (${workspaceName})`,
      );
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
