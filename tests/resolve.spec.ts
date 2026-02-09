import { join } from "node:path"
import { mkdtemp, rm, mkdir } from "node:fs/promises"
import { tmpdir } from "node:os"
import { vi, beforeEach, afterEach } from "vitest"

let tempDir: string

beforeEach(async () => {
	vi.resetModules()
	tempDir = await mkdtemp(join(tmpdir(), "holla-test-"))
	// Create cache dir
	await mkdir(join(tempDir, ".config", "holla", "cache"), { recursive: true })
	vi.stubEnv("HOME", tempDir)
})

afterEach(async () => {
	vi.unstubAllEnvs()
	await rm(tempDir, { recursive: true })
})

function mockClient(channels: { name: string; id: string }[], users: { name: string; id: string }[]) {
	return {
		conversations: {
			list: vi.fn().mockResolvedValue({
				channels,
				response_metadata: { next_cursor: "" },
			}),
		},
		users: {
			list: vi.fn().mockResolvedValue({
				members: users,
				response_metadata: { next_cursor: "" },
			}),
		},
	} as unknown
}

describe("resolveChannel", () => {
	it("should return raw channel ID when input does not start with #", async () => {
		const { resolveChannel } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([], [])
		const result = await resolveChannel(client as any, "C12345", "ws1")
		expect(result).toBe("C12345")
		expect((client as any).conversations.list).not.toHaveBeenCalled()
	})

	it("should resolve #channel-name to channel ID", async () => {
		const { resolveChannel } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([{ name: "general", id: "C001" }], [])
		const result = await resolveChannel(client as any, "#general", "ws1")
		expect(result).toBe("C001")
	})

	it("should throw when channel name is not found", async () => {
		const { resolveChannel } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([], [])
		await expect(resolveChannel(client as any, "#nonexistent", "ws1")).rejects.toThrow(
			"Channel not found: #nonexistent",
		)
	})

	it("should use file cache on second call", async () => {
		const { resolveChannel } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([{ name: "general", id: "C001" }], [])
		await resolveChannel(client as any, "#general", "ws1")
		await resolveChannel(client as any, "#general", "ws1")
		expect((client as any).conversations.list).toHaveBeenCalledTimes(1)
	})

	it("should namespace cache by workspace (regression: cross-workspace collision)", async () => {
		const { resolveChannel } = await import("../src/platforms/slack/resolve.ts")
		const clientA = mockClient([{ name: "general", id: "C001" }], [])
		const clientB = mockClient([{ name: "general", id: "C999" }], [])

		const idA = await resolveChannel(clientA as any, "#general", "workspace-a")
		const idB = await resolveChannel(clientB as any, "#general", "workspace-b")

		expect(idA).toBe("C001")
		expect(idB).toBe("C999")
		expect((clientA as any).conversations.list).toHaveBeenCalledTimes(1)
		expect((clientB as any).conversations.list).toHaveBeenCalledTimes(1)
	})
})

describe("resolveUser", () => {
	it("should return raw user ID when input does not start with @", async () => {
		const { resolveUser } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([], [])
		const result = await resolveUser(client as any, "U12345", "ws1")
		expect(result).toBe("U12345")
		expect((client as any).users.list).not.toHaveBeenCalled()
	})

	it("should resolve @username to user ID", async () => {
		const { resolveUser } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([], [{ name: "john", id: "U001" }])
		const result = await resolveUser(client as any, "@john", "ws1")
		expect(result).toBe("U001")
	})

	it("should throw when user name is not found", async () => {
		const { resolveUser } = await import("../src/platforms/slack/resolve.ts")
		const client = mockClient([], [])
		await expect(resolveUser(client as any, "@ghost", "ws1")).rejects.toThrow(
			"User not found: @ghost",
		)
	})

	it("should namespace user cache by workspace", async () => {
		const { resolveUser } = await import("../src/platforms/slack/resolve.ts")
		const clientA = mockClient([], [{ name: "john", id: "U001" }])
		const clientB = mockClient([], [{ name: "john", id: "U999" }])

		const idA = await resolveUser(clientA as any, "@john", "workspace-a")
		const idB = await resolveUser(clientB as any, "@john", "workspace-b")

		expect(idA).toBe("U001")
		expect(idB).toBe("U999")
	})
})
