import { defineCommand } from "citty";
import { storeToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { ensureConfigDir } from "../../../lib/config.ts";
import { handleError } from "../../../lib/errors.ts";
import manifest from "../../../../slack-app-manifest.json";

const REDIRECT_URI = "https://holla.circles.ac/callback";
const DEFAULT_CLIENT_ID = "8296864935811.10462015149125";
const DEFAULT_CLIENT_SECRET = "85212febb6a85d3088045da95297188a";

const BOT_SCOPES = manifest.oauth_config.scopes.bot.join(",");
const USER_SCOPES = manifest.oauth_config.scopes.user.join(",");

async function loginWithToken(token: string, alias?: string): Promise<void> {
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
  const result = await client.auth.test();
  const teamName = result.team as string;
  const teamId = result.team_id as string | undefined;
  const teamUrl = result.url as string | undefined;

  const derivedName = teamUrl
    ? new URL(teamUrl).hostname.split(".")[0]!
    : teamName.toLowerCase().replace(/\s+/g, "-");
  const workspaceName = alias ?? derivedName;

  await storeToken(workspaceName, tokenType, token, { teamId, teamName });

  console.log(
    `\x1b[32m✓\x1b[0m Authorized! ${tokenType} token saved for "${teamName}" (${workspaceName})`,
  );
}

function randomPort(): number {
  return 49152 + Math.floor(Math.random() * 16384);
}

async function loginWithOAuth(
  clientId: string,
  clientSecret: string,
  alias?: string,
): Promise<void> {
  const port = randomPort();
  const state = btoa(JSON.stringify({ p: port }));

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", BOT_SCOPES);
  authUrl.searchParams.set("user_scope", USER_SCOPES);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);

  console.log("Opening browser for Slack authorization...");
  console.log(`Waiting for callback on http://localhost:${port}/callback...\n`);

  const code = await new Promise<string>((resolve, reject) => {
    const server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const error = url.searchParams.get("error");
        if (error) {
          clearTimeout(timer);
          reject(new Error(`OAuth denied: ${error}`));
          setTimeout(() => server.stop(), 100);
          return new Response(
            "<html><body><h2>Authorization denied.</h2><p>You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }

        const authCode = url.searchParams.get("code");
        if (!authCode) {
          clearTimeout(timer);
          reject(new Error("No code in callback"));
          setTimeout(() => server.stop(), 100);
          return new Response("Missing code", { status: 400 });
        }

        clearTimeout(timer);
        resolve(authCode);
        setTimeout(() => server.stop(), 100);
        return new Response(
          "<html><body><h2>Authorized!</h2><p>You can close this tab and return to the terminal.</p></body></html>",
          { headers: { "Content-Type": "text/html" } },
        );
      },
    });

    // Open browser
    const openCmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
          : "xdg-open";

    const openArgs =
      process.platform === "win32"
        ? [openCmd, "-NoProfile", "-Command", `Start-Process "${authUrl.toString()}"`]
        : [openCmd, authUrl.toString()];

    Bun.spawn(openArgs, {
      stdout: "ignore",
      stderr: "ignore",
    });

    // Timeout after 2 minutes
    const timer = setTimeout(() => {
      server.stop();
      reject(new Error("OAuth timed out after 2 minutes"));
    }, 120_000);
  });

  // Exchange code for tokens
  console.log("Exchanging code for tokens...");

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = (await response.json()) as {
    ok: boolean;
    error?: string;
    team?: { name: string; id: string };
    access_token?: string;
    authed_user?: { access_token?: string };
    incoming_webhook?: { url: string };
  };

  if (!data.ok) {
    throw new Error(`Token exchange failed: ${data.error ?? "unknown error"}`);
  }

  const teamName = data.team?.name ?? "unknown";
  const teamId = data.team?.id ?? "";

  // Derive workspace name from team info (unless overridden via --name)
  let derivedName = teamName.toLowerCase().replace(/\s+/g, "-");

  // Try to get the actual subdomain via auth.test
  const botToken = data.access_token;
  if (botToken) {
    try {
      const client = createSlackClient(botToken);
      const authResult = await client.auth.test();
      const teamUrl = authResult.url as string | undefined;
      if (teamUrl) {
        derivedName = new URL(teamUrl).hostname.split(".")[0]!;
      }
    } catch {
      // fall back to derived name
    }
  }

  const workspaceName = alias ?? derivedName;
  const identity = { teamId, teamName };

  // Store tokens
  let botSaved = false;
  let userSaved = false;

  if (data.access_token) {
    await storeToken(workspaceName, "bot", data.access_token, identity);
    botSaved = true;
  }

  if (data.authed_user?.access_token) {
    await storeToken(workspaceName, "user", data.authed_user.access_token, identity);
    userSaved = true;
  }

  console.log(
    `\x1b[32m✓\x1b[0m Authorized! Tokens saved as "${workspaceName}" for "${teamName}" (${teamId})`,
  );
  console.log(
    `  Bot token:  ${botSaved ? "\x1b[32m✓\x1b[0m" : "\x1b[33m—\x1b[0m not granted"}`,
  );
  console.log(
    `  User token: ${userSaved ? "\x1b[32m✓\x1b[0m" : "\x1b[33m—\x1b[0m not granted"}`,
  );
}

export const loginCommand = defineCommand({
  meta: { name: "login", description: "Authenticate with Slack" },
  args: {
    token: {
      type: "string",
      description: "Slack token (xoxb-... or xoxp-...) for manual auth",
    },
    name: {
      type: "string",
      description:
        "Custom workspace alias for the credential file (use to register multiple tokens against the same team, e.g. acme_bot vs acme_ops)",
      alias: "as",
    },
    "client-id": {
      type: "string",
      description: "Slack app client ID (or set SLACK_CLIENT_ID)",
    },
    "client-secret": {
      type: "string",
      description: "Slack app client secret (or set SLACK_CLIENT_SECRET)",
    },
  },
  async run({ args }) {
    await ensureConfigDir();

    const alias = args.name?.trim() || undefined;
    if (alias && !/^[a-zA-Z0-9_-]+$/.test(alias)) {
      console.error(
        "\x1b[31m✗\x1b[0m --name must contain only letters, digits, hyphen, or underscore",
      );
      process.exit(1);
    }

    // Manual token flow
    if (args.token) {
      try {
        await loginWithToken(args.token, alias);
      } catch (error) {
        handleError(error);
      }
      return;
    }

    // OAuth flow
    const clientId =
      args["client-id"] ?? process.env["SLACK_CLIENT_ID"] ?? DEFAULT_CLIENT_ID;
    const clientSecret =
      args["client-secret"] ?? process.env["SLACK_CLIENT_SECRET"] ?? DEFAULT_CLIENT_SECRET;

    try {
      await loginWithOAuth(clientId, clientSecret, alias);
    } catch (error) {
      handleError(error);
    }
  },
});
