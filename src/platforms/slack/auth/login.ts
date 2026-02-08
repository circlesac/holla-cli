import { defineCommand } from "citty";
import { storeToken } from "../../../lib/credentials.ts";
import { createSlackClient } from "../client.ts";
import { ensureConfigDir } from "../../../lib/config.ts";
import manifest from "../../../../slack-app-manifest.json";

const DEFAULT_PORT = 9876;
const DEFAULT_CLIENT_ID = "8296864935811.10462015149125";
const DEFAULT_CLIENT_SECRET = "85212febb6a85d3088045da95297188a";

const BOT_SCOPES = manifest.oauth_config.scopes.bot.join(",");
const USER_SCOPES = manifest.oauth_config.scopes.user.join(",");

async function loginWithToken(token: string): Promise<void> {
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
  const workspace = result.team as string;
  const teamUrl = result.url as string;

  const workspaceName = teamUrl
    ? new URL(teamUrl).hostname.split(".")[0]!
    : workspace.toLowerCase().replace(/\s+/g, "-");

  await storeToken(workspaceName, tokenType, token);

  console.log(
    `\x1b[32m✓\x1b[0m Authorized! ${tokenType} token saved for "${workspace}" (${workspaceName})`,
  );
}

async function loginWithOAuth(
  clientId: string,
  clientSecret: string,
  port: number,
): Promise<void> {
  const redirectUri = `http://localhost:${port}/callback`;

  const authUrl = new URL("https://slack.com/oauth/v2/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("scope", BOT_SCOPES);
  authUrl.searchParams.set("user_scope", USER_SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  console.log("Opening browser for Slack authorization...");
  console.log(
    `Waiting for callback on http://localhost:${port}/callback...\n`,
  );

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
          ? "start"
          : "xdg-open";

    Bun.spawn([openCmd, authUrl.toString()], {
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
      redirect_uri: redirectUri,
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

  // Derive workspace name from team info
  let workspaceName = teamName.toLowerCase().replace(/\s+/g, "-");

  // Try to get the actual subdomain via auth.test
  const botToken = data.access_token;
  if (botToken) {
    try {
      const client = createSlackClient(botToken);
      const authResult = await client.auth.test();
      const teamUrl = authResult.url as string | undefined;
      if (teamUrl) {
        workspaceName = new URL(teamUrl).hostname.split(".")[0]!;
      }
    } catch {
      // fall back to derived name
    }
  }

  // Store tokens
  let botSaved = false;
  let userSaved = false;

  if (data.access_token) {
    await storeToken(workspaceName, "bot", data.access_token);
    botSaved = true;
  }

  if (data.authed_user?.access_token) {
    await storeToken(workspaceName, "user", data.authed_user.access_token);
    userSaved = true;
  }

  console.log(
    `\x1b[32m✓\x1b[0m Authorized! Tokens saved for "${teamName}" (${teamId})`,
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
    "client-id": {
      type: "string",
      description: "Slack app client ID (or set SLACK_CLIENT_ID)",
    },
    "client-secret": {
      type: "string",
      description: "Slack app client secret (or set SLACK_CLIENT_SECRET)",
    },
    port: {
      type: "string",
      description: `Local port for OAuth callback (default: ${DEFAULT_PORT})`,
    },
  },
  async run({ args }) {
    await ensureConfigDir();

    // Manual token flow
    if (args.token) {
      try {
        await loginWithToken(args.token);
      } catch (error) {
        console.error(
          `\x1b[31m✗\x1b[0m Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        process.exit(1);
      }
      return;
    }

    // OAuth flow
    const clientId =
      args["client-id"] ?? process.env["SLACK_CLIENT_ID"] ?? DEFAULT_CLIENT_ID;
    const clientSecret =
      args["client-secret"] ?? process.env["SLACK_CLIENT_SECRET"] ?? DEFAULT_CLIENT_SECRET;

    const port = args.port ? parseInt(args.port, 10) : DEFAULT_PORT;

    try {
      await loginWithOAuth(clientId, clientSecret, port);
    } catch (error) {
      console.error(
        `\x1b[31m✗\x1b[0m OAuth failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
  },
});
