import { defineCommand } from "citty";
import { getToken } from "../../lib/credentials.ts";
import { createSlackClient } from "./client.ts";

export const apiCommand = defineCommand({
  meta: {
    name: "api",
    description: "Raw Slack API passthrough (any method)",
  },
  args: {
    workspace: {
      type: "string",
      description: "Workspace name",
      alias: "w",
    },
    body: {
      type: "string",
      description: "Raw JSON body",
    },
    _: {
      type: "positional",
      description: "API method and key-value args",
      required: true,
    },
  },
  async run({ args }) {
    const rawArgs = args._ as unknown as string[];
    const method = rawArgs[0];

    if (!method) {
      console.error("\x1b[31m✗\x1b[0m Usage: holla slack api <method> [--key value ...]");
      process.exit(1);
    }

    const { token } = await getToken(args.workspace);
    const client = createSlackClient(token);

    let apiArgs: Record<string, unknown> = {};

    if (args.body) {
      try {
        apiArgs = JSON.parse(args.body) as Record<string, unknown>;
      } catch {
        console.error("\x1b[31m✗\x1b[0m Invalid JSON in --body");
        process.exit(1);
      }
    }

    // Parse remaining --key value pairs from rawArgs
    const rest = rawArgs.slice(1);
    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i]!;
      if (arg.startsWith("--")) {
        const key = arg.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        const next = rest[i + 1];
        if (next && !next.startsWith("--")) {
          apiArgs[key] = next;
          i++;
        } else {
          apiArgs[key] = true;
        }
      }
    }

    try {
      const result = await client.apiCall(method, apiArgs);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\x1b[31m✗\x1b[0m ${error.message}`);
      }
      process.exit(1);
    }
  },
});
