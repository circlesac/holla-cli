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
})
