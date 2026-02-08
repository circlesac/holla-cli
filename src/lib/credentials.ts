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
): Promise<void> {
  await ensureCredentialsDir();
  const existing = await getWorkspaceCredentials(workspace);
  const creds: WorkspaceCredentials = existing ?? { name: workspace };

  if (tokenType === "bot") {
    creds.botToken = token;
  } else {
    creds.userToken = token;
  }

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

export async function getToken(
  workspace: string | undefined,
  preferUser = false,
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

  const token = preferUser
    ? creds.userToken ?? creds.botToken
    : creds.botToken ?? creds.userToken;

  if (!token) {
    throw new Error(
      `No token found for workspace "${creds.name}". Run "holla slack auth login" to authenticate.`,
    );
  }

  return { token, workspace: creds.name };
}
