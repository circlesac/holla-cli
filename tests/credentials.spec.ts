import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { vi, beforeEach, afterEach } from "vitest"

let tempDir: string

beforeEach(async () => {
	vi.resetModules()
	tempDir = await mkdtemp(join(tmpdir(), "holla-test-"))
	vi.stubEnv("HOME", tempDir)
})

afterEach(async () => {
	vi.unstubAllEnvs()
	await rm(tempDir, { recursive: true })
})

describe("credentials", () => {
	it("should store and retrieve a bot token", async () => {
		const { storeToken, getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)

		await storeToken("test-ws", "bot", "xoxb-test-token")
		const creds = await getWorkspaceCredentials("test-ws")

		expect(creds).not.toBeNull()
		expect(creds!.name).toBe("test-ws")
		expect(creds!.botToken).toBe("xoxb-test-token")
	})

	it("should store and retrieve a user token", async () => {
		const { storeToken, getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)

		await storeToken("test-ws", "user", "xoxp-test-token")
		const creds = await getWorkspaceCredentials("test-ws")

		expect(creds).not.toBeNull()
		expect(creds!.userToken).toBe("xoxp-test-token")
	})

	it("should store both tokens for same workspace", async () => {
		const { storeToken, getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)

		await storeToken("test-ws", "bot", "xoxb-bot")
		await storeToken("test-ws", "user", "xoxp-user")
		const creds = await getWorkspaceCredentials("test-ws")

		expect(creds!.botToken).toBe("xoxb-bot")
		expect(creds!.userToken).toBe("xoxp-user")
	})

	it("should list workspaces", async () => {
		const { storeToken, listWorkspaces } = await import(
			"../src/lib/credentials.ts"
		)

		await storeToken("ws-a", "bot", "xoxb-a")
		await storeToken("ws-b", "bot", "xoxb-b")
		const list = await listWorkspaces()

		expect(list).toHaveLength(2)
		const names = list.map((w) => w.name).sort()
		expect(names).toStrictEqual(["ws-a", "ws-b"])
	})

	it("should remove a workspace", async () => {
		const { storeToken, removeWorkspace, listWorkspaces } = await import(
			"../src/lib/credentials.ts"
		)

		await storeToken("ws-remove", "bot", "xoxb-remove")
		const removed = await removeWorkspace("ws-remove")
		expect(removed).toBe(true)

		const list = await listWorkspaces()
		expect(list.find((w) => w.name === "ws-remove")).toBeUndefined()
	})

	it("should return false when removing non-existent workspace", async () => {
		const { removeWorkspace } = await import("../src/lib/credentials.ts")
		const removed = await removeWorkspace("non-existent")
		expect(removed).toBe(false)
	})

	it("should return null for non-existent workspace credentials", async () => {
		const { getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)
		const creds = await getWorkspaceCredentials("non-existent")
		expect(creds).toBeNull()
	})

	it("should use SLACK_TOKEN env var in getToken", async () => {
		vi.stubEnv("SLACK_TOKEN", "xoxb-env-token")
		const { getToken } = await import("../src/lib/credentials.ts")
		const result = await getToken(undefined)

		expect(result.token).toBe("xoxb-env-token")
		expect(result.workspace).toBe("env")
	})

	it("should use user token in getToken", async () => {
		const { storeToken, getToken } = await import("../src/lib/credentials.ts")
		await storeToken("test-ws", "bot", "xoxb-bot")
		await storeToken("test-ws", "user", "xoxp-user")
		const result = await getToken("test-ws")
		expect(result.token).toBe("xoxp-user")
	})

	it("should throw when only bot token exists", async () => {
		const { storeToken, getToken } = await import("../src/lib/credentials.ts")
		await storeToken("test-ws", "bot", "xoxb-bot")
		await expect(getToken("test-ws")).rejects.toThrow("No user token found")
	})

	it("should persist team identity when provided", async () => {
		const { storeToken, getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)
		await storeToken("acme_bot", "bot", "xoxb-1", {
			teamId: "T0123",
			teamName: "Acme",
		})
		const creds = await getWorkspaceCredentials("acme_bot")
		expect(creds!.teamId).toBe("T0123")
		expect(creds!.teamName).toBe("Acme")
	})

	it("should support two aliases for the same team (regression: #29)", async () => {
		const { storeToken, listWorkspaces, getWorkspaceCredentials } = await import(
			"../src/lib/credentials.ts"
		)
		await storeToken("acme_bot", "user", "xoxp-bot-app", {
			teamId: "T0123",
			teamName: "Acme",
		})
		await storeToken("acme_ops", "user", "xoxp-ops-app", {
			teamId: "T0123",
			teamName: "Acme",
		})

		const list = await listWorkspaces()
		const names = list.map((w) => w.name).sort()
		expect(names).toStrictEqual(["acme_bot", "acme_ops"])

		const bot = await getWorkspaceCredentials("acme_bot")
		const ops = await getWorkspaceCredentials("acme_ops")
		expect(bot!.userToken).toBe("xoxp-bot-app")
		expect(ops!.userToken).toBe("xoxp-ops-app")
		expect(bot!.teamId).toBe("T0123")
		expect(ops!.teamId).toBe("T0123")
	})
})
