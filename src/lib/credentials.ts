import { join } from "node:path";
import { mkdir, readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { homedir } from "node:os";
import type { WorkspaceCredentials } from "../types/index.ts";

const CREDENTIALS_DIR = join(homedir(), ".config", "holla", "credentials");

async function ensureCredentialsDir(): Promise<void> {
  await mkdir(CREDENTIALS_DIR, { recursive: true });
}

function credentialPath(workspace: string): string {
  return join(CREDENTIALS_DIR, `${workspace}.json`);
}

export async function storeToken(
  workspace: string,
  tokenType: "bot" | "user",
  token: string,
  identity?: { teamId?: string; teamName?: string },
): Promise<void> {
  await ensureCredentialsDir();
  const existing = await getWorkspaceCredentials(workspace);
  const creds: WorkspaceCredentials = existing ?? { name: workspace };

  if (tokenType === "bot") {
    creds.botToken = token;
  } else {
    creds.userToken = token;
  }

  if (identity?.teamId) creds.teamId = identity.teamId;
  if (identity?.teamName) creds.teamName = identity.teamName;

  await writeFile(credentialPath(workspace), JSON.stringify(creds, null, 2));
}

export async function getWorkspaceCredentials(
  workspace: string,
): Promise<WorkspaceCredentials | null> {
  try {
    const content = await readFile(credentialPath(workspace), "utf-8");
    return JSON.parse(content) as WorkspaceCredentials;
  } catch {
    return null;
  }
}

export async function listWorkspaces(): Promise<WorkspaceCredentials[]> {
  await ensureCredentialsDir();
  try {
    const files = await readdir(CREDENTIALS_DIR);
    const workspaces: WorkspaceCredentials[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const content = await readFile(join(CREDENTIALS_DIR, file), "utf-8");
        workspaces.push(JSON.parse(content) as WorkspaceCredentials);
      } catch {
        // skip corrupt files
      }
    }
    return workspaces;
  } catch {
    return [];
  }
}

export async function removeWorkspace(workspace: string): Promise<boolean> {
  try {
    await unlink(credentialPath(workspace));
    return true;
  } catch {
    return false;
  }
}

export async function storeBrowserCredentials(
  workspace: string,
  browserToken: string,
  browserCookie: string,
): Promise<void> {
  await ensureCredentialsDir();
  const existing = await getWorkspaceCredentials(workspace);
  const creds: WorkspaceCredentials = existing ?? { name: workspace };
  creds.browserToken = browserToken;
  creds.browserCookie = browserCookie;
  await writeFile(credentialPath(workspace), JSON.stringify(creds, null, 2));
}

export async function getBrowserCredentials(
  workspace: string | undefined,
): Promise<{ browserToken: string; browserCookie: string; workspace: string }> {
  const workspaces = await listWorkspaces();

  if (workspaces.length === 0) {
    throw new Error(
      'No workspaces configured. Run "holla slack auth login" to authenticate.',
    );
  }

  let creds: WorkspaceCredentials;

  if (workspace) {
    const found = workspaces.find((w) => w.name === workspace);
    if (!found) {
      throw new Error(
        `Workspace "${workspace}" not found. Available: ${workspaces.map((w) => w.name).join(", ")}`,
      );
    }
    creds = found;
  } else if (workspaces.length === 1) {
    creds = workspaces[0]!;
  } else {
    const names = workspaces.map((w) => w.name).join(", ");
    throw new Error(
      `Multiple workspaces found. Use --workspace to specify: ${names}`,
    );
  }

  if (!creds.browserToken || !creds.browserCookie) {
    // Try to auto-read from the Slack desktop app (macOS only)
    const { readSlackDesktopCredentials } = await import("../platforms/slack/later/desktop.ts");
    const desktop = await readSlackDesktopCredentials(creds.name);
    if (desktop) {
      return { browserToken: desktop.xoxc, browserCookie: desktop.xoxd, workspace: creds.name };
    }

    throw new Error(
      `No browser credentials found for workspace "${creds.name}". Run: holla slack auth browser --workspace ${creds.name}`,
    );
  }

  return { browserToken: creds.browserToken, browserCookie: creds.browserCookie, workspace: creds.name };
}

/**
 * Resolves the holla bot's user ID for a workspace (for mention-based
 * attribution). Cached in the credential file; resolved once via the bot
 * token's auth.test. Returns null if there's no bot token.
 */
export async function getBotUserId(workspace: string): Promise<string | null> {
  const creds = await getWorkspaceCredentials(workspace);
  if (!creds) return null;
  if (creds.botUserId) return creds.botUserId;
  if (!creds.botToken) return null;
  try {
    const { createSlackClient } = await import("../platforms/slack/client.ts");
    const result = await createSlackClient(creds.botToken).auth.test();
    const userId = result.user_id as string | undefined;
    if (userId) {
      creds.botUserId = userId;
      await writeFile(credentialPath(workspace), JSON.stringify(creds, null, 2));
      return userId;
    }
  } catch {}
  return null;
}

export async function getToken(
  workspace: string | undefined,
): Promise<{ token: string; workspace: string }> {
  // Check environment variable first
  const envToken = process.env["SLACK_TOKEN"];
  if (envToken) {
    return { token: envToken, workspace: workspace ?? "env" };
  }

  const workspaces = await listWorkspaces();

  if (workspaces.length === 0) {
    throw new Error(
      'No workspaces configured. Run "holla slack auth login" to authenticate.',
    );
  }

  let creds: WorkspaceCredentials;

  if (workspace) {
    const found = workspaces.find((w) => w.name === workspace);
    if (!found) {
      throw new Error(
        `Workspace "${workspace}" not found. Available: ${workspaces.map((w) => w.name).join(", ")}`,
      );
    }
    creds = found;
  } else if (workspaces.length === 1) {
    creds = workspaces[0]!;
  } else {
    const names = workspaces.map((w) => w.name).join(", ");
    throw new Error(
      `Multiple workspaces found. Use --workspace to specify: ${names}`,
    );
  }

  if (!creds.userToken) {
    throw new Error(
      `No user token found for workspace "${creds.name}". Run: holla slack auth login --workspace ${creds.name}`,
    );
  }

  return { token: creds.userToken, workspace: creds.name };
}
