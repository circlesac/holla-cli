import { vi, beforeEach } from "vitest"

// --- mocks ---

const mockArchive = vi.fn().mockResolvedValue({ ok: true })
const mockCreate = vi.fn().mockResolvedValue({ channel: { id: "C999", name: "new-channel" } })
const mockInfo = vi.fn().mockResolvedValue({
	channel: {
		id: "C001",
		name: "general",
		is_channel: true,
		is_private: false,
		is_archived: false,
		created: 1600000000,
		creator: "U001",
		topic: { value: "General chat" },
		purpose: { value: "A place for general discussion" },
		num_members: 42,
	},
})
const mockInvite = vi.fn().mockResolvedValue({ ok: true })
const mockJoin = vi.fn().mockResolvedValue({ ok: true })
const mockKick = vi.fn().mockResolvedValue({ ok: true })
const mockLeave = vi.fn().mockResolvedValue({ ok: true })
const mockMark = vi.fn().mockResolvedValue({ ok: true })
const mockSetPurpose = vi.fn().mockResolvedValue({ ok: true })
const mockSetTopic = vi.fn().mockResolvedValue({ ok: true })
const mockUnarchive = vi.fn().mockResolvedValue({ ok: true })
const mockChatDelete = vi.fn().mockResolvedValue({ ok: true })
const mockGetPermalink = vi.fn().mockResolvedValue({ permalink: "https://test-ws.slack.com/archives/C001/p111222" })
const mockApiCall = vi.fn().mockResolvedValue({ ok: true })

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		conversations: {
			archive: mockArchive,
			create: mockCreate,
			info: mockInfo,
			invite: mockInvite,
			join: mockJoin,
			kick: mockKick,
			leave: mockLeave,
			mark: mockMark,
			setPurpose: mockSetPurpose,
			setTopic: mockSetTopic,
			unarchive: mockUnarchive,
		},
		chat: {
			delete: mockChatDelete,
			getPermalink: mockGetPermalink,
		},
		apiCall: mockApiCall,
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
// Channel action commands
// ──────────────────────────────────────────────

describe("channels archive", () => {
	async function run(args: Record<string, unknown>) {
		const { archiveCommand } = await import("../src/platforms/slack/channels/archive.ts")
		await (archiveCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should call conversations.archive with resolved channel ID", async () => {
		await run({})
		expect(mockArchive).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Channel archived"))
	})
})

describe("channels create", () => {
	async function run(args: Record<string, unknown>) {
		const { createCommand } = await import("../src/platforms/slack/channels/create.ts")
		await (createCommand as any).run({ args: { workspace: "test-ws", name: "new-channel", ...args } })
	}

	it("should create a public channel by default", async () => {
		await run({})
		expect(mockCreate).toHaveBeenCalledWith({ name: "new-channel", is_private: false })
	})

	it("should create a private channel when --private is set", async () => {
		await run({ private: true })
		expect(mockCreate).toHaveBeenCalledWith({ name: "new-channel", is_private: true })
	})

	it("should print channel name and ID on success", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("new-channel"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("C999"))
	})
})

describe("channels info", () => {
	async function run(args: Record<string, unknown>) {
		const { infoCommand } = await import("../src/platforms/slack/channels/info.ts")
		await (infoCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should call conversations.info with resolved channel ID", async () => {
		await run({})
		expect(mockInfo).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("should print channel info via console.log", async () => {
		await run({})
		expect(console.log).toHaveBeenCalled()
	})
})

describe("channels invite", () => {
	async function run(args: Record<string, unknown>) {
		const { inviteCommand } = await import("../src/platforms/slack/channels/invite.ts")
		await (inviteCommand as any).run({ args: { workspace: "test-ws", channel: "#general", user: "@bob", ...args } })
	}

	it("should call conversations.invite with resolved channel and user", async () => {
		await run({})
		expect(mockInvite).toHaveBeenCalledWith({ channel: "C001", users: "U001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("User invited to channel"))
	})
})

describe("channels join", () => {
	async function run(args: Record<string, unknown>) {
		const { joinCommand } = await import("../src/platforms/slack/channels/join.ts")
		await (joinCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should call conversations.join with resolved channel ID", async () => {
		await run({})
		expect(mockJoin).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Joined channel"))
	})
})

describe("channels kick", () => {
	async function run(args: Record<string, unknown>) {
		const { kickCommand } = await import("../src/platforms/slack/channels/kick.ts")
		await (kickCommand as any).run({ args: { workspace: "test-ws", channel: "#general", user: "@bob", ...args } })
	}

	it("should call conversations.kick with resolved channel and user", async () => {
		await run({})
		expect(mockKick).toHaveBeenCalledWith({ channel: "C001", user: "U001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("User removed from channel"))
	})
})

describe("channels leave", () => {
	async function run(args: Record<string, unknown>) {
		const { leaveCommand } = await import("../src/platforms/slack/channels/leave.ts")
		await (leaveCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should call conversations.leave with resolved channel ID", async () => {
		await run({})
		expect(mockLeave).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Left channel"))
	})
})

describe("channels mark-read", () => {
	async function run(args: Record<string, unknown>) {
		const { markReadCommand } = await import("../src/platforms/slack/channels/mark-read.ts")
		await (markReadCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ts: "111.222", ...args } })
	}

	it("should call conversations.mark with resolved channel and ts", async () => {
		await run({})
		expect(mockMark).toHaveBeenCalledWith({ channel: "C001", ts: "111.222" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Channel marked as read"))
	})
})

describe("channels purpose", () => {
	async function run(args: Record<string, unknown>) {
		const { purposeCommand } = await import("../src/platforms/slack/channels/purpose.ts")
		await (purposeCommand as any).run({ args: { workspace: "test-ws", channel: "#general", purpose: "New purpose", ...args } })
	}

	it("should call conversations.setPurpose with resolved channel and purpose", async () => {
		await run({})
		expect(mockSetPurpose).toHaveBeenCalledWith({ channel: "C001", purpose: "New purpose" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Channel purpose updated"))
	})
})

describe("channels topic", () => {
	async function run(args: Record<string, unknown>) {
		const { topicCommand } = await import("../src/platforms/slack/channels/topic.ts")
		await (topicCommand as any).run({ args: { workspace: "test-ws", channel: "#general", topic: "New topic", ...args } })
	}

	it("should call conversations.setTopic with resolved channel and topic", async () => {
		await run({})
		expect(mockSetTopic).toHaveBeenCalledWith({ channel: "C001", topic: "New topic" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Channel topic updated"))
	})
})

describe("channels unarchive", () => {
	async function run(args: Record<string, unknown>) {
		const { unarchiveCommand } = await import("../src/platforms/slack/channels/unarchive.ts")
		await (unarchiveCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ...args } })
	}

	it("should call conversations.unarchive with resolved channel ID", async () => {
		await run({})
		expect(mockUnarchive).toHaveBeenCalledWith({ channel: "C001" })
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Channel unarchived"))
	})
})

// ──────────────────────────────────────────────
// Chat extra commands
// ──────────────────────────────────────────────

describe("chat delete", () => {
	async function run(args: Record<string, unknown>) {
		const { deleteCommand } = await import("../src/platforms/slack/chat/delete.ts")
		await (deleteCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ts: "111.222", ...args } })
	}

	it("should call chat.delete with resolved channel and ts", async () => {
		await run({})
		expect(mockChatDelete).toHaveBeenCalledWith({ channel: "C001", ts: "111.222" })
	})

	it("should print success message with ts", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Message deleted"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("111.222"))
	})
})

describe("chat permalink", () => {
	async function run(args: Record<string, unknown>) {
		const { permalinkCommand } = await import("../src/platforms/slack/chat/permalink.ts")
		await (permalinkCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ts: "111.222", ...args } })
	}

	it("should call chat.getPermalink with resolved channel and message_ts", async () => {
		await run({})
		expect(mockGetPermalink).toHaveBeenCalledWith({ channel: "C001", message_ts: "111.222" })
	})

	it("should print the permalink URL", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith("https://test-ws.slack.com/archives/C001/p111222")
	})
})

describe("chat unfurl", () => {
	async function run(args: Record<string, unknown>) {
		const { unfurlCommand } = await import("../src/platforms/slack/chat/unfurl.ts")
		await (unfurlCommand as any).run({ args: { workspace: "test-ws", channel: "#general", ts: "111.222", ...args } })
	}

	it("should call apiCall with parsed unfurls JSON", async () => {
		const unfurls = JSON.stringify({ "https://example.com": { text: "Example" } })
		await run({ unfurls })
		expect(mockApiCall).toHaveBeenCalledWith("chat.unfurl", {
			channel: "C001",
			ts: "111.222",
			unfurls: { "https://example.com": { text: "Example" } },
		})
	})

	it("should print success message", async () => {
		const unfurls = JSON.stringify({ "https://example.com": { text: "Example" } })
		await run({ unfurls })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Unfurl data provided"))
	})
})
