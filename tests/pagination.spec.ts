import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { vi, beforeEach } from "vitest"

let tempDir: string

// --- mocks ---

const mockConversationsList = vi.fn()
const mockConversationsHistory = vi.fn()
const mockConversationsMembers = vi.fn()
const mockConversationsReplies = vi.fn()
const mockUsersList = vi.fn()
const mockStarsList = vi.fn()
const mockFilesList = vi.fn()
const mockReactionsList = vi.fn()

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		conversations: {
			list: (...a: unknown[]) => mockConversationsList(...a),
			history: (...a: unknown[]) => mockConversationsHistory(...a),
			members: (...a: unknown[]) => mockConversationsMembers(...a),
			replies: (...a: unknown[]) => mockConversationsReplies(...a),
		},
		users: { list: (...a: unknown[]) => mockUsersList(...a) },
		stars: { list: (...a: unknown[]) => mockStarsList(...a) },
		files: { list: (...a: unknown[]) => mockFilesList(...a) },
		reactions: { list: (...a: unknown[]) => mockReactionsList(...a) },
	})),
}))

vi.mock("../src/platforms/slack/resolve.ts", () => ({
	resolveChannel: vi.fn().mockResolvedValue("C001"),
	resolveUser: vi.fn().mockResolvedValue("U001"),
}))

beforeEach(async () => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
	// Isolate cache writes per test so the shared cache file doesn't leak across runs.
	tempDir = await mkdtemp(join(tmpdir(), "holla-pagination-test-"))
	vi.stubEnv("HOME", tempDir)
})

afterEach(async () => {
	vi.restoreAllMocks()
	vi.unstubAllEnvs()
	await rm(tempDir, { recursive: true, force: true })
})

// ──────────────────────────────────────────────
// Auto-loop pagination (--all flag)
// ──────────────────────────────────────────────

describe("channels list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/channels/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should fetch one page by default", async () => {
		mockConversationsList.mockResolvedValueOnce({
			channels: [{ id: "C1", name: "general" }],
			response_metadata: { next_cursor: "abc123" },
		})
		await run({})
		expect(mockConversationsList).toHaveBeenCalledTimes(1)
	})

	it("should auto-paginate when --all is set", async () => {
		mockConversationsList
			.mockResolvedValueOnce({
				channels: [{ id: "C1", name: "general" }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				channels: [{ id: "C2", name: "random" }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockConversationsList).toHaveBeenCalledTimes(2)
		expect(mockConversationsList).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})

	it("should not pass limit when not specified", async () => {
		mockConversationsList.mockResolvedValueOnce({ channels: [] })
		await run({})
		expect(mockConversationsList).toHaveBeenCalledWith(
			expect.not.objectContaining({ limit: expect.anything() }),
		)
	})

	it("should pass custom limit", async () => {
		mockConversationsList.mockResolvedValueOnce({ channels: [] })
		await run({ limit: "100" })
		expect(mockConversationsList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 100 }),
		)
	})

	it("should pass manual cursor", async () => {
		mockConversationsList.mockResolvedValueOnce({ channels: [] })
		await run({ cursor: "manual_cursor" })
		expect(mockConversationsList).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "manual_cursor" }),
		)
	})

	it("should filter channels by --name (case-insensitive substring)", async () => {
		mockConversationsList.mockResolvedValueOnce({
			channels: [
				{ id: "C1", name: "general" },
				{ id: "C2", name: "random" },
				{ id: "C3", name: "general-announcements" },
			],
			response_metadata: { next_cursor: "" },
		})
		await run({ name: "GENERAL", json: true })
		const output = (console.log as any).mock.calls[0][0]
		const parsed = JSON.parse(output)
		expect(parsed).toHaveLength(2)
		expect(parsed[0].name).toBe("general")
		expect(parsed[1].name).toBe("general-announcements")
	})
})

describe("channels history", () => {
	async function run(args: Record<string, unknown>) {
		const { historyCommand } = await import("../src/platforms/slack/channels/history.ts")
		await (historyCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should fetch one page by default", async () => {
		mockConversationsHistory.mockResolvedValueOnce({
			messages: [{ ts: "1", user: "U1", text: "hi" }],
			response_metadata: { next_cursor: "abc" },
		})
		await run({})
		expect(mockConversationsHistory).toHaveBeenCalledTimes(1)
	})

	it("should auto-paginate when --all is set", async () => {
		mockConversationsHistory
			.mockResolvedValueOnce({
				messages: [{ ts: "1", text: "a" }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				messages: [{ ts: "2", text: "b" }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockConversationsHistory).toHaveBeenCalledTimes(2)
		expect(mockConversationsHistory).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})

	it("should include attachments and files when present", async () => {
		const attachments = [{ title: "PR #42", text: "Fix bug" }]
		const files = [{ id: "F001", name: "doc.pdf" }]
		mockConversationsHistory.mockResolvedValueOnce({
			messages: [
				{ ts: "1", user: "U1", text: "", attachments, files },
				{ ts: "2", user: "U2", text: "plain" },
			],
		})
		await run({ json: true })
		const output = (console.log as any).mock.calls[0][0]
		const parsed = JSON.parse(output)
		expect(parsed[0].attachments).toEqual(attachments)
		expect(parsed[0].files).toEqual(files)
		expect(parsed[1].attachments).toBeUndefined()
		expect(parsed[1].files).toBeUndefined()
	})

	it("should pass --before as latest", async () => {
		mockConversationsHistory.mockResolvedValueOnce({ messages: [] })
		await run({ before: "1700000000.000000" })
		expect(mockConversationsHistory).toHaveBeenCalledWith(
			expect.objectContaining({ latest: "1700000000.000000" }),
		)
	})

	it("--all with cache: fetches only newer than the cached newestTs and appends (#24)", async () => {
		// First run: populate cache
		mockConversationsHistory.mockResolvedValueOnce({
			messages: [
				{ ts: "100.0", user: "U1", text: "old1" },
				{ ts: "50.0", user: "U1", text: "old0" },
			],
			response_metadata: { next_cursor: "" },
		})
		await run({ all: true })

		// Second run: should pass oldest=100.0 to fetch only newer
		mockConversationsHistory.mockResolvedValueOnce({
			messages: [{ ts: "200.0", user: "U2", text: "new1" }],
			response_metadata: { next_cursor: "" },
		})
		await run({ all: true, json: true })

		expect(mockConversationsHistory).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ oldest: "100.0" }),
		)
		const output = (console.log as any).mock.calls.at(-1)[0]
		const parsed = JSON.parse(output)
		expect(parsed.map((m: { ts: string }) => m.ts)).toEqual(["200.0", "100.0", "50.0"])
	})

	it("--all with --no-cache: ignores cache and refetches everything (#24)", async () => {
		mockConversationsHistory.mockResolvedValueOnce({
			messages: [{ ts: "100.0", user: "U1", text: "first" }],
			response_metadata: { next_cursor: "" },
		})
		await run({ all: true })

		mockConversationsHistory.mockResolvedValueOnce({
			messages: [{ ts: "300.0", user: "U2", text: "new" }],
			response_metadata: { next_cursor: "" },
		})
		await run({ all: true, "no-cache": true })

		expect(mockConversationsHistory).toHaveBeenNthCalledWith(2,
			expect.not.objectContaining({ oldest: expect.anything() }),
		)
	})
})

describe("channels members", () => {
	async function run(args: Record<string, unknown>) {
		const { membersCommand } = await import("../src/platforms/slack/channels/members.ts")
		await (membersCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should fetch one page by default", async () => {
		mockConversationsMembers.mockResolvedValueOnce({
			members: ["U1"],
			response_metadata: { next_cursor: "abc" },
		})
		await run({})
		expect(mockConversationsMembers).toHaveBeenCalledTimes(1)
	})

	it("should auto-paginate when --all is set", async () => {
		mockConversationsMembers
			.mockResolvedValueOnce({
				members: ["U1"],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				members: ["U2"],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockConversationsMembers).toHaveBeenCalledTimes(2)
	})
})

describe("users list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/users/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should always auto-paginate (no --all needed)", async () => {
		mockUsersList
			.mockResolvedValueOnce({
				members: [{ id: "U1", name: "a" }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				members: [{ id: "U2", name: "b" }],
				response_metadata: { next_cursor: "" },
			})
		await run({})
		expect(mockUsersList).toHaveBeenCalledTimes(2)
		expect(mockUsersList).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})

	it("should default limit to 1000", async () => {
		mockUsersList.mockResolvedValueOnce({ members: [], response_metadata: {} })
		await run({})
		expect(mockUsersList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 1000 }),
		)
	})

	it("should accept custom limit", async () => {
		mockUsersList.mockResolvedValueOnce({ members: [], response_metadata: {} })
		await run({ limit: "500" })
		expect(mockUsersList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 500 }),
		)
	})

	it("should use --cursor as starting point", async () => {
		mockUsersList.mockResolvedValueOnce({
			members: [{ id: "U3", name: "c" }],
			response_metadata: { next_cursor: "" },
		})
		await run({ cursor: "start_here" })
		expect(mockUsersList).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "start_here" }),
		)
	})
})

// ──────────────────────────────────────────────
// Manual cursor pagination
// ──────────────────────────────────────────────

describe("channels replies", () => {
	async function run(args: Record<string, unknown>) {
		const { repliesCommand } = await import("../src/platforms/slack/channels/replies.ts")
		await (repliesCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ts: "111.222", ...args } })
	}

	it("should pass cursor when provided", async () => {
		mockConversationsReplies.mockResolvedValueOnce({ messages: [] })
		await run({ cursor: "xyz" })
		expect(mockConversationsReplies).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "xyz" }),
		)
	})

	it("should pass limit when provided", async () => {
		mockConversationsReplies.mockResolvedValueOnce({ messages: [] })
		await run({ limit: "10" })
		expect(mockConversationsReplies).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 10 }),
		)
	})

	it("should auto-paginate when --all is set", async () => {
		mockConversationsReplies
			.mockResolvedValueOnce({
				messages: [{ ts: "1", user: "U1", text: "a" }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				messages: [{ ts: "2", user: "U2", text: "b" }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockConversationsReplies).toHaveBeenCalledTimes(2)
		expect(mockConversationsReplies).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})
})

describe("stars list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/stars/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should not pass count when not specified", async () => {
		mockStarsList.mockResolvedValueOnce({ items: [] })
		await run({})
		expect(mockStarsList).toHaveBeenCalledWith(
			expect.not.objectContaining({ count: expect.anything() }),
		)
	})

	it("should pass cursor when provided", async () => {
		mockStarsList.mockResolvedValueOnce({ items: [] })
		await run({ cursor: "abc" })
		expect(mockStarsList).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "abc" }),
		)
	})

	it("should not include cursor when not provided", async () => {
		mockStarsList.mockResolvedValueOnce({ items: [] })
		await run({})
		const call = mockStarsList.mock.calls[0]![0]
		expect(call).not.toHaveProperty("cursor")
	})

	it("should auto-paginate when --all is set", async () => {
		mockStarsList
			.mockResolvedValueOnce({
				items: [{ type: "message", message: { ts: "1", text: "a" } }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				items: [{ type: "message", message: { ts: "2", text: "b" } }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockStarsList).toHaveBeenCalledTimes(2)
		expect(mockStarsList).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})
})

describe("files list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/files/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should not pass count when not specified", async () => {
		mockFilesList.mockResolvedValueOnce({ files: [] })
		await run({})
		expect(mockFilesList).toHaveBeenCalledWith(
			expect.not.objectContaining({ count: expect.anything() }),
		)
	})

	it("should pass cursor when provided", async () => {
		mockFilesList.mockResolvedValueOnce({ files: [] })
		await run({ cursor: "abc" })
		expect(mockFilesList).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "abc" }),
		)
	})

	it("should pass custom limit as count", async () => {
		mockFilesList.mockResolvedValueOnce({ files: [] })
		await run({ limit: "50" })
		expect(mockFilesList).toHaveBeenCalledWith(
			expect.objectContaining({ count: 50 }),
		)
	})

	it("should auto-paginate when --all is set", async () => {
		mockFilesList
			.mockResolvedValueOnce({
				files: [{ id: "F1", name: "a.txt" }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				files: [{ id: "F2", name: "b.txt" }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockFilesList).toHaveBeenCalledTimes(2)
		expect(mockFilesList).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})
})

describe("reactions list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/reactions/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should not pass limit when not specified", async () => {
		mockReactionsList.mockResolvedValueOnce({ items: [] })
		await run({})
		expect(mockReactionsList).toHaveBeenCalledWith(
			expect.not.objectContaining({ limit: expect.anything() }),
		)
	})

	it("should pass cursor when provided", async () => {
		mockReactionsList.mockResolvedValueOnce({ items: [] })
		await run({ cursor: "abc" })
		expect(mockReactionsList).toHaveBeenCalledWith(
			expect.objectContaining({ cursor: "abc" }),
		)
	})

	it("should set full: true", async () => {
		mockReactionsList.mockResolvedValueOnce({ items: [] })
		await run({})
		expect(mockReactionsList).toHaveBeenCalledWith(
			expect.objectContaining({ full: true }),
		)
	})

	it("should auto-paginate when --all is set", async () => {
		mockReactionsList
			.mockResolvedValueOnce({
				items: [{ type: "message", message: { ts: "1", text: "a" } }],
				response_metadata: { next_cursor: "page2" },
			})
			.mockResolvedValueOnce({
				items: [{ type: "message", message: { ts: "2", text: "b" } }],
				response_metadata: { next_cursor: "" },
			})
		await run({ all: true })
		expect(mockReactionsList).toHaveBeenCalledTimes(2)
		expect(mockReactionsList).toHaveBeenNthCalledWith(2,
			expect.objectContaining({ cursor: "page2" }),
		)
	})
})
