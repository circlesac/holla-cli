import { randomBytes, webcrypto } from "node:crypto";
import { chmod, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { WorkspaceCredentials } from "../types/index.ts";

const KEY_FILE_NAME = ".encryption_key";
const ENCRYPTED_PREFIX = "enc:v1:";
const KEY_BYTES = 32;
const IV_BYTES = 12;

function getCredentialsDir(): string {
	return join(homedir(), ".config", "holla", "credentials");
}

function getKeyPath(): string {
	return join(homedir(), ".config", "holla", KEY_FILE_NAME);
}

function credentialPath(workspace: string): string {
	return join(getCredentialsDir(), `${workspace}.json`);
}

async function ensureCredentialsDir(): Promise<void> {
	const hollaDir = join(homedir(), ".config", "holla");
	const dir = getCredentialsDir();
	await mkdir(hollaDir, { recursive: true, mode: 0o700 });
	await chmod(hollaDir, 0o700);
	await mkdir(dir, { recursive: true, mode: 0o700 });
	await chmod(dir, 0o700);
}

async function loadOrCreateKey(): Promise<Uint8Array> {
	const keyPath = getKeyPath();
	try {
		const encoded = (await readFile(keyPath, "utf8")).trim();
		const key = Buffer.from(encoded, "base64url");
		if (key.length !== KEY_BYTES) throw new Error("Invalid holla credential encryption key");
		await chmod(keyPath, 0o600);
		return key;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
	}

	const key = randomBytes(KEY_BYTES);
	const tempPath = `${keyPath}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(tempPath, key.toString("base64url"), { mode: 0o600, flag: "wx" });
	try {
		await rename(tempPath, keyPath);
	} catch (error) {
		await unlink(tempPath).catch(() => {});
		if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
	}
	await chmod(keyPath, 0o600);
	return Buffer.from((await readFile(keyPath, "utf8")).trim(), "base64url");
}

async function encrypt(value: string, key: Uint8Array): Promise<string> {
	const iv = randomBytes(IV_BYTES);
	const cryptoKey = await webcrypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
	const ciphertext = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, Buffer.from(value, "utf8"));
	return `${ENCRYPTED_PREFIX}${Buffer.concat([iv, Buffer.from(ciphertext)]).toString("base64url")}`;
}

async function decrypt(value: string, key: Uint8Array): Promise<string> {
	if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
	const encoded = Buffer.from(value.slice(ENCRYPTED_PREFIX.length), "base64url");
	if (encoded.length <= IV_BYTES) throw new Error("Invalid encrypted holla credential");
	const cryptoKey = await webcrypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
	const plaintext = await webcrypto.subtle.decrypt(
		{ name: "AES-GCM", iv: encoded.subarray(0, IV_BYTES) },
		cryptoKey,
		encoded.subarray(IV_BYTES),
	);
	return Buffer.from(plaintext).toString("utf8");
}

async function decryptCredentials(value: WorkspaceCredentials): Promise<WorkspaceCredentials> {
	const fields = ["userToken", "botToken", "browserToken", "browserCookie"] as const;
	const encryptedFields = fields.filter((field) => typeof value[field] === "string" && value[field]!.startsWith(ENCRYPTED_PREFIX));
	if (encryptedFields.length === 0) return value;

	const key = await loadOrCreateKey();
	const decrypted = { ...value };
	for (const field of encryptedFields) decrypted[field] = await decrypt(value[field]!, key);
	return decrypted;
}

function hasPlaintextSecret(value: WorkspaceCredentials): boolean {
	return ["userToken", "botToken", "browserToken", "browserCookie"].some(
		(field) => {
			const secret = value[field as keyof WorkspaceCredentials];
			return typeof secret === "string" && !secret.startsWith(ENCRYPTED_PREFIX);
		},
	);
}

async function writeCredentials(value: WorkspaceCredentials): Promise<void> {
	await ensureCredentialsDir();
	const key = await loadOrCreateKey();
	const encrypted: WorkspaceCredentials = { ...value };
	for (const field of ["userToken", "botToken", "browserToken", "browserCookie"] as const) {
		if (typeof value[field] === "string") encrypted[field] = await encrypt(value[field]!, key);
	}

	const path = credentialPath(value.name);
	const tempPath = `${path}.${process.pid}.${Date.now()}.tmp`;
	await writeFile(tempPath, `${JSON.stringify(encrypted, null, 2)}\n`, { mode: 0o600, flag: "wx" });
	await chmod(tempPath, 0o600);
	await rename(tempPath, path);
	await chmod(path, 0o600);
}

export async function storeToken(workspace: string, tokenType: "bot" | "user", token: string, identity?: { teamId?: string; teamName?: string }): Promise<void> {
	const existing = await getWorkspaceCredentials(workspace);
	const creds: WorkspaceCredentials = existing ?? { name: workspace };
	if (tokenType === "bot") creds.botToken = token;
	else creds.userToken = token;
	if (identity?.teamId) creds.teamId = identity.teamId;
	if (identity?.teamName) creds.teamName = identity.teamName;
	await writeCredentials(creds);
}

export async function getWorkspaceCredentials(workspace: string): Promise<WorkspaceCredentials | null> {
	try {
		const content = await readFile(credentialPath(workspace), "utf8");
		const parsed = JSON.parse(content) as WorkspaceCredentials;
		const credentials = await decryptCredentials(parsed);
		if (hasPlaintextSecret(parsed)) await writeCredentials(credentials);
		return credentials;
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
		return null;
	}
}

export async function listWorkspaces(): Promise<WorkspaceCredentials[]> {
	await ensureCredentialsDir();
	try {
		const files = await readdir(getCredentialsDir());
		const workspaces: WorkspaceCredentials[] = [];
		for (const file of files) {
			if (!file.endsWith(".json")) continue;
			const credentials = await getWorkspaceCredentials(file.slice(0, -5));
			if (credentials) workspaces.push(credentials);
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

export async function storeBrowserCredentials(workspace: string, browserToken: string, browserCookie: string): Promise<void> {
	const existing = await getWorkspaceCredentials(workspace);
	const creds: WorkspaceCredentials = existing ?? { name: workspace };
	creds.browserToken = browserToken;
	creds.browserCookie = browserCookie;
	await writeCredentials(creds);
}

export async function getBrowserCredentials(workspace: string | undefined): Promise<{ browserToken: string; browserCookie: string; workspace: string }> {
	const workspaces = await listWorkspaces();
	if (workspaces.length === 0) throw new Error('No workspaces configured. Run "holla slack auth login" to authenticate.');

	let creds: WorkspaceCredentials;
	if (workspace) {
		const found = workspaces.find((w) => w.name === workspace);
		if (!found) throw new Error(`Workspace "${workspace}" not found. Available: ${workspaces.map((w) => w.name).join(", ")}`);
		creds = found;
	} else if (workspaces.length === 1) creds = workspaces[0]!;
	else throw new Error(`Multiple workspaces found. Use --workspace to specify: ${workspaces.map((w) => w.name).join(", ")}`);

	if (!creds.browserToken || !creds.browserCookie) {
		const { readSlackDesktopCredentials } = await import("../platforms/slack/later/desktop.ts");
		const desktop = await readSlackDesktopCredentials(creds.name);
		if (desktop) return { browserToken: desktop.xoxc, browserCookie: desktop.xoxd, workspace: creds.name };
		throw new Error(`No browser credentials found for workspace "${creds.name}". Run: holla slack auth browser --workspace ${creds.name}`);
	}

	return { browserToken: creds.browserToken, browserCookie: creds.browserCookie, workspace: creds.name };
}

export async function getBotUserId(workspace: string): Promise<string | null> {
	const creds = await getWorkspaceCredentials(workspace);
	if (!creds?.botToken) return null;
	if (creds.botUserId) return creds.botUserId;
	try {
		const { createSlackClient } = await import("../platforms/slack/client.ts");
		const result = await createSlackClient(creds.botToken).auth.test();
		const userId = result.user_id as string | undefined;
		if (userId) {
			creds.botUserId = userId;
			await writeCredentials(creds);
			return userId;
		}
	} catch {}
	return null;
}

export async function getToken(workspace: string | undefined): Promise<{ token: string; workspace: string }> {
	const envToken = process.env["SLACK_TOKEN"];
	if (envToken) return { token: envToken, workspace: workspace ?? "env" };

	const workspaces = await listWorkspaces();
	if (workspaces.length === 0) throw new Error('No workspaces configured. Run "holla slack auth login" to authenticate.');

	let creds: WorkspaceCredentials;
	if (workspace) {
		const found = workspaces.find((w) => w.name === workspace);
		if (!found) throw new Error(`Workspace "${workspace}" not found. Available: ${workspaces.map((w) => w.name).join(", ")}`);
		creds = found;
	} else if (workspaces.length === 1) creds = workspaces[0]!;
	else throw new Error(`Multiple workspaces found. Use --workspace to specify: ${workspaces.map((w) => w.name).join(", ")}`);

	if (!creds.userToken) throw new Error(`No user token found for workspace "${creds.name}". Run: holla slack auth login --workspace ${creds.name}`);
	return { token: creds.userToken, workspace: creds.name };
}
