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
  },
  async run({ args }) {
    // Parse raw argv after "api" since citty treats positional args as subcommand names
    const apiIdx = process.argv.indexOf("api");
    const rawArgs = apiIdx >= 0 ? process.argv.slice(apiIdx + 1) : [];

    // Extract method (first non-flag arg)
    let method: string | undefined;
    const flagArgs: string[] = [];
    for (const arg of rawArgs) {
      if (!method && !arg.startsWith("-")) {
        method = arg;
      } else {
        flagArgs.push(arg);
      }
    }

    if (!method) {
      console.error("\x1b[31m✗\x1b[0m Usage: holla slack api <method> [--key value ...]");
      process.exit(1);
    }

    const { token } = await getToken(args.workspace);
    const client = createSlackClient(token);

    const apiArgs: Record<string, unknown> = {};

    // Check for --body flag
    const bodyIdx = flagArgs.indexOf("--body");
    if (bodyIdx >= 0 && flagArgs[bodyIdx + 1]) {
      try {
        Object.assign(apiArgs, JSON.parse(flagArgs[bodyIdx + 1]!) as Record<string, unknown>);
      } catch {
        console.error("\x1b[31m✗\x1b[0m Invalid JSON in --body");
        process.exit(1);
      }
    }

    // Parse --key value pairs (skip --workspace, -w, --body and their values)
    const skip = new Set(["--workspace", "-w", "--body"]);
    for (let i = 0; i < flagArgs.length; i++) {
      const arg = flagArgs[i]!;
      if (skip.has(arg)) {
        i++;
        continue;
      }
      if (arg.startsWith("--")) {
        const key = arg.slice(2).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
        const next = flagArgs[i + 1];
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
