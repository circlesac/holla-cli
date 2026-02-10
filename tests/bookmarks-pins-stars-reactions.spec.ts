import { vi, beforeEach, afterEach, describe, it, expect } from "vitest"

// Mock functions — one per API method/namespace
const mockBookmarksAdd = vi.fn().mockResolvedValue({ ok: true })
const mockBookmarksEdit = vi.fn().mockResolvedValue({ ok: true })
const mockBookmarksList = vi.fn().mockResolvedValue({
	bookmarks: [
		{ id: "Bk01", title: "Docs", link: "https://docs.example.com", type: "link" },
	],
})
const mockBookmarksRemove = vi.fn().mockResolvedValue({ ok: true })

const mockPinsAdd = vi.fn().mockResolvedValue({ ok: true })
const mockPinsList = vi.fn().mockResolvedValue({
	items: [
		{ type: "message", message: { ts: "111.222", user: "U001", text: "hello" }, created: 1700000000 },
	],
})
const mockPinsRemove = vi.fn().mockResolvedValue({ ok: true })

const mockApiCall = vi.fn().mockResolvedValue({ ok: true })

const mockReactionsAdd = vi.fn().mockResolvedValue({ ok: true })
const mockReactionsGet = vi.fn().mockResolvedValue({
	message: {
		reactions: [{ name: "thumbsup", count: 3, users: ["U001", "U002", "U003"] }],
	},
})
const mockReactionsRemove = vi.fn().mockResolvedValue({ ok: true })

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		bookmarks: {
			add: mockBookmarksAdd,
			edit: mockBookmarksEdit,
			list: mockBookmarksList,
			remove: mockBookmarksRemove,
		},
		pins: {
			add: mockPinsAdd,
			list: mockPinsList,
			remove: mockPinsRemove,
		},
		reactions: {
			add: mockReactionsAdd,
			get: mockReactionsGet,
			remove: mockReactionsRemove,
		},
		apiCall: mockApiCall,
	})),
}))

vi.mock("../src/platforms/slack/resolve.ts", () => ({
	resolveChannel: vi.fn().mockResolvedValue("C001"),
}))

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

// ── Bookmarks ────────────────────────────────────────────────

describe("bookmarks add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/bookmarks/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls bookmarks.add with resolved channel, title, type, link", async () => {
		await run({ channel: "#general", title: "Docs", link: "https://example.com" })
		expect(mockBookmarksAdd).toHaveBeenCalledWith({
			channel_id: "C001",
			title: "Docs",
			type: "link",
			link: "https://example.com",
		})
	})

	it("passes emoji when provided", async () => {
		await run({ channel: "#general", title: "Docs", link: "https://example.com", emoji: ":books:" })
		expect(mockBookmarksAdd).toHaveBeenCalledWith(
			expect.objectContaining({ emoji: ":books:" }),
		)
	})

	it("prints success message", async () => {
		await run({ channel: "#general", title: "Docs", link: "https://example.com" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Bookmark added"))
	})
})

describe("bookmarks edit", () => {
	async function run(args: Record<string, unknown>) {
		const { editCommand } = await import("../src/platforms/slack/bookmarks/edit.ts")
		await (editCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls bookmarks.edit with raw channel (no resolveChannel) and bookmark_id", async () => {
		await run({ channel: "C123", bookmark: "Bk01", title: "New Title" })
		expect(mockBookmarksEdit).toHaveBeenCalledWith({
			channel_id: "C123",
			bookmark_id: "Bk01",
			title: "New Title",
		})
	})

	it("spreads optional link and emoji only when provided", async () => {
		await run({ channel: "C123", bookmark: "Bk01" })
		expect(mockBookmarksEdit).toHaveBeenCalledWith({
			channel_id: "C123",
			bookmark_id: "Bk01",
		})
	})
})

describe("bookmarks list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/bookmarks/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls bookmarks.list with resolved channel_id", async () => {
		await run({ channel: "#general" })
		expect(mockBookmarksList).toHaveBeenCalledWith({ channel_id: "C001" })
	})

	it("prints output", async () => {
		await run({ channel: "#general" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("bookmarks remove", () => {
	async function run(args: Record<string, unknown>) {
		const { removeCommand } = await import("../src/platforms/slack/bookmarks/remove.ts")
		await (removeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls bookmarks.remove with resolved channel_id and bookmark_id", async () => {
		await run({ channel: "#general", bookmark: "Bk01" })
		expect(mockBookmarksRemove).toHaveBeenCalledWith({
			channel_id: "C001",
			bookmark_id: "Bk01",
		})
	})

	it("prints success message", async () => {
		await run({ channel: "#general", bookmark: "Bk01" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Bookmark removed"))
	})
})

// ── Pins ─────────────────────────────────────────────────────

describe("pins add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/pins/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls pins.add with resolved channel and timestamp", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(mockPinsAdd).toHaveBeenCalledWith({ channel: "C001", timestamp: "111.222" })
	})

	it("prints success message", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Message pinned"))
	})
})

describe("pins list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/pins/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls pins.list with resolved channel", async () => {
		await run({ channel: "#general" })
		expect(mockPinsList).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("prints output", async () => {
		await run({ channel: "#general" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("pins remove", () => {
	async function run(args: Record<string, unknown>) {
		const { removeCommand } = await import("../src/platforms/slack/pins/remove.ts")
		await (removeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls pins.remove with resolved channel and timestamp", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(mockPinsRemove).toHaveBeenCalledWith({ channel: "C001", timestamp: "111.222" })
	})

	it("prints success message", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Message unpinned"))
	})
})

// ── Stars ────────────────────────────────────────────────────

describe("stars add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/stars/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls apiCall('stars.add') with channel and timestamp", async () => {
		await run({ channel: "C123", ts: "111.222" })
		expect(mockApiCall).toHaveBeenCalledWith("stars.add", {
			channel: "C123",
			timestamp: "111.222",
		})
	})

	it("calls apiCall('stars.add') with file only", async () => {
		await run({ file: "F001" })
		expect(mockApiCall).toHaveBeenCalledWith("stars.add", { file: "F001" })
	})

	it("prints success message", async () => {
		await run({ channel: "C123", ts: "111.222" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Item starred"))
	})
})

describe("stars remove", () => {
	async function run(args: Record<string, unknown>) {
		const { removeCommand } = await import("../src/platforms/slack/stars/remove.ts")
		await (removeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls apiCall('stars.remove') with channel and timestamp", async () => {
		await run({ channel: "C123", ts: "111.222" })
		expect(mockApiCall).toHaveBeenCalledWith("stars.remove", {
			channel: "C123",
			timestamp: "111.222",
		})
	})

	it("calls apiCall('stars.remove') with file only", async () => {
		await run({ file: "F001" })
		expect(mockApiCall).toHaveBeenCalledWith("stars.remove", { file: "F001" })
	})

	it("prints success message", async () => {
		await run({ channel: "C123" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Star removed"))
	})
})

// ── Reactions ────────────────────────────────────────────────

describe("reactions add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/reactions/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls reactions.add with resolved channel, timestamp, name", async () => {
		await run({ channel: "#general", ts: "111.222", name: "thumbsup" })
		expect(mockReactionsAdd).toHaveBeenCalledWith({
			channel: "C001",
			timestamp: "111.222",
			name: "thumbsup",
		})
	})

	it("prints success message", async () => {
		await run({ channel: "#general", ts: "111.222", name: "thumbsup" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Reaction :thumbsup: added"))
	})
})

describe("reactions get", () => {
	async function run(args: Record<string, unknown>) {
		const { getCommand } = await import("../src/platforms/slack/reactions/get.ts")
		await (getCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls reactions.get with resolved channel, timestamp, and full: true", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(mockReactionsGet).toHaveBeenCalledWith({
			channel: "C001",
			timestamp: "111.222",
			full: true,
		})
	})

	it("prints output", async () => {
		await run({ channel: "#general", ts: "111.222" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("reactions remove", () => {
	async function run(args: Record<string, unknown>) {
		const { removeCommand } = await import("../src/platforms/slack/reactions/remove.ts")
		await (removeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls reactions.remove with resolved channel, timestamp, name", async () => {
		await run({ channel: "#general", ts: "111.222", name: "thumbsup" })
		expect(mockReactionsRemove).toHaveBeenCalledWith({
			channel: "C001",
			timestamp: "111.222",
			name: "thumbsup",
		})
	})

	it("prints success message", async () => {
		await run({ channel: "#general", ts: "111.222", name: "thumbsup" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Reaction :thumbsup: removed"))
	})
})
