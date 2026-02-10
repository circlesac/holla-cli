import { vi, beforeEach } from "vitest"

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

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
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

	it("should pass limit (default 20)", async () => {
		mockConversationsList.mockResolvedValueOnce({ channels: [] })
		await run({})
		expect(mockConversationsList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 20 }),
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

	it("should pass --before as latest", async () => {
		mockConversationsHistory.mockResolvedValueOnce({ messages: [] })
		await run({ before: "1700000000.000000" })
		expect(mockConversationsHistory).toHaveBeenCalledWith(
			expect.objectContaining({ latest: "1700000000.000000" }),
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

	it("should default count to 20", async () => {
		mockStarsList.mockResolvedValueOnce({ items: [] })
		await run({})
		expect(mockStarsList).toHaveBeenCalledWith(
			expect.objectContaining({ count: 20 }),
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

	it("should default count to 20", async () => {
		mockFilesList.mockResolvedValueOnce({ files: [] })
		await run({})
		expect(mockFilesList).toHaveBeenCalledWith(
			expect.objectContaining({ count: 20 }),
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

	it("should default limit to 20", async () => {
		mockReactionsList.mockResolvedValueOnce({ items: [] })
		await run({})
		expect(mockReactionsList).toHaveBeenCalledWith(
			expect.objectContaining({ limit: 20 }),
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
