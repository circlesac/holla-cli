import { vi, beforeEach } from "vitest"

const mockSearchMessages = vi.fn().mockResolvedValue({
	messages: {
		matches: [{ channel: { name: "general" }, username: "bob", ts: "111.222", text: "hello" }],
		paging: { page: 1, pages: 5, total: 100, count: 20 },
	},
})
const mockSearchAll = vi.fn().mockResolvedValue({
	messages: {
		matches: [{ channel: { name: "general" }, username: "bob", ts: "111.222", text: "hello" }],
		paging: { page: 1, pages: 3, total: 50, count: 20 },
	},
	files: {
		matches: [],
		paging: { page: 1, pages: 2, total: 30, count: 20 },
	},
})
const mockSearchFiles = vi.fn().mockResolvedValue({
	files: {
		matches: [{ id: "F001", name: "doc.pdf", title: "Doc", filetype: "pdf", user: "U001" }],
		paging: { page: 2, pages: 4, total: 80, count: 20 },
	},
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

	it("should print paging info to stderr", async () => {
		await run({})
		expect(console.error).toHaveBeenCalledWith("Page 1/5 (100 total results)")
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

	it("should print paging info for both messages and files", async () => {
		await run({})
		expect(console.error).toHaveBeenCalledWith("Messages: Page 1/3 (50 total results)")
		expect(console.error).toHaveBeenCalledWith("Files: Page 1/2 (30 total results)")
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

	it("should print paging info to stderr", async () => {
		await run({})
		expect(console.error).toHaveBeenCalledWith("Page 2/4 (80 total results)")
	})
})
