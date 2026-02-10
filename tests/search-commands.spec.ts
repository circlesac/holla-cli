import { vi, beforeEach } from "vitest"

const mockSearchMessages = vi.fn().mockResolvedValue({
	messages: { matches: [{ channel: { name: "general" }, username: "bob", ts: "111.222", text: "hello" }] },
})
const mockSearchAll = vi.fn().mockResolvedValue({
	messages: { matches: [{ channel: { name: "general" }, username: "bob", ts: "111.222", text: "hello" }] },
	files: { matches: [] },
})
const mockSearchFiles = vi.fn().mockResolvedValue({
	files: { matches: [{ id: "F001", name: "doc.pdf", title: "Doc", filetype: "pdf", user: "U001" }] },
})

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		search: {
			messages: mockSearchMessages,
			all: mockSearchAll,
			files: mockSearchFiles,
		},
	})),
}))

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("search messages", () => {
	async function run(args: Record<string, unknown>) {
		const { messagesCommand } = await import("../src/platforms/slack/search/messages.ts")
		await (messagesCommand as any).run({ args: { query: "test", ...args } })
	}

	it("should default to page 1", async () => {
		await run({})
		expect(mockSearchMessages).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1 }),
		)
	})

	it("should pass --page as a number", async () => {
		await run({ page: "3" })
		expect(mockSearchMessages).toHaveBeenCalledWith(
			expect.objectContaining({ page: 3 }),
		)
	})

	it("should default count to 20", async () => {
		await run({})
		expect(mockSearchMessages).toHaveBeenCalledWith(
			expect.objectContaining({ count: 20 }),
		)
	})

	it("should pass --limit as count", async () => {
		await run({ limit: "50" })
		expect(mockSearchMessages).toHaveBeenCalledWith(
			expect.objectContaining({ count: 50 }),
		)
	})
})

describe("search all", () => {
	async function run(args: Record<string, unknown>) {
		const { allCommand } = await import("../src/platforms/slack/search/all.ts")
		await (allCommand as any).run({ args: { query: "test", ...args } })
	}

	it("should pass page parameter", async () => {
		await run({ page: "2" })
		expect(mockSearchAll).toHaveBeenCalledWith(
			expect.objectContaining({ page: 2 }),
		)
	})

	it("should default to page 1 and count 20", async () => {
		await run({})
		expect(mockSearchAll).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, count: 20 }),
		)
	})
})

describe("search files", () => {
	async function run(args: Record<string, unknown>) {
		const { filesCommand } = await import("../src/platforms/slack/search/files.ts")
		await (filesCommand as any).run({ args: { query: "test", ...args } })
	}

	it("should pass page parameter", async () => {
		await run({ page: "5" })
		expect(mockSearchFiles).toHaveBeenCalledWith(
			expect.objectContaining({ page: 5 }),
		)
	})

	it("should default to page 1 and count 20", async () => {
		await run({})
		expect(mockSearchFiles).toHaveBeenCalledWith(
			expect.objectContaining({ page: 1, count: 20 }),
		)
	})
})
