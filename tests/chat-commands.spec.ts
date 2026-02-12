import { vi, beforeEach } from "vitest"

const mockPostMessage = vi.fn().mockResolvedValue({ ts: "123.456", ok: true })
const mockUpdate = vi.fn().mockResolvedValue({ ts: "123.456", ok: true })
const mockPostEphemeral = vi.fn().mockResolvedValue({ message_ts: "123.456", ok: true })
const mockScheduleMessage = vi.fn().mockResolvedValue({
	scheduled_message_id: "Q123",
	post_at: 1700000000,
	ok: true,
})
const mockMarkdownToBlocks = vi.fn().mockResolvedValue([{ type: "section" }])

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		chat: {
			postMessage: mockPostMessage,
			update: mockUpdate,
			postEphemeral: mockPostEphemeral,
			scheduleMessage: mockScheduleMessage,
		},
	})),
}))

vi.mock("../src/platforms/slack/resolve.ts", () => ({
	resolveChannel: vi.fn().mockResolvedValue("C001"),
	resolveUser: vi.fn().mockResolvedValue("U001"),
}))

vi.mock("@circlesac/mack", () => ({
	markdownToBlocks: mockMarkdownToBlocks,
}))

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("send command", () => {
	async function runSend(args: Record<string, unknown>) {
		const { sendCommand } = await import("../src/platforms/slack/chat/send.ts")
		await (sendCommand as any).run({ args: { workspace: "test-ws", channel: "C001", ...args } })
	}

	it("should call normalizeSlackText (regression: zsh <!here> escaping)", async () => {
		await runSend({ text: "<\\!here> test" })
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({ text: "<!here> test" }),
		)
	})

	it("should call markdownToBlocks", async () => {
		await runSend({ text: "hello" })
		expect(mockMarkdownToBlocks).toHaveBeenCalledWith("hello")
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({ blocks: [{ type: "section" }] }),
		)
	})
})

describe("reply command", () => {
	async function runReply(args: Record<string, unknown>) {
		const { replyCommand } = await import("../src/platforms/slack/chat/reply.ts")
		await (replyCommand as any).run({ args: { workspace: "test-ws", channel: "C001", ...args } })
	}

	it("should pass thread_ts when --thread is provided", async () => {
		await runReply({ text: "hi", thread: "1234567890.123456" })
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({ thread_ts: "1234567890.123456" }),
		)
	})

	it("should call markdownToBlocks", async () => {
		await runReply({ text: "hello", thread: "1234567890.123456" })
		expect(mockMarkdownToBlocks).toHaveBeenCalledWith("hello")
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({ blocks: [{ type: "section" }] }),
		)
	})
})

describe("edit command", () => {
	async function runEdit(args: Record<string, unknown>) {
		const { editCommand } = await import("../src/platforms/slack/chat/edit.ts")
		await (editCommand as any).run({
			args: { workspace: "test-ws", channel: "C001", ts: "111.222", ...args },
		})
	}

	it("should call normalizeSlackText (regression: zsh escaping)", async () => {
		await runEdit({ text: "<\\!channel> update" })
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ text: "<!channel> update" }),
		)
	})

	it("should call markdownToBlocks", async () => {
		await runEdit({ text: "updated" })
		expect(mockMarkdownToBlocks).toHaveBeenCalledWith("updated")
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ blocks: [{ type: "section" }] }),
		)
	})
})

describe("whisper command", () => {
	async function runWhisper(args: Record<string, unknown>) {
		const { whisperCommand } = await import("../src/platforms/slack/chat/whisper.ts")
		await (whisperCommand as any).run({
			args: { workspace: "test-ws", channel: "C001", user: "U001", ...args },
		})
	}

	it("should call normalizeSlackText (regression: zsh escaping)", async () => {
		await runWhisper({ text: "<\\!everyone> whisper" })
		expect(mockPostEphemeral).toHaveBeenCalledWith(
			expect.objectContaining({ text: "<!everyone> whisper" }),
		)
	})

	it("should call markdownToBlocks", async () => {
		await runWhisper({ text: "secret" })
		expect(mockMarkdownToBlocks).toHaveBeenCalledWith("secret")
		expect(mockPostEphemeral).toHaveBeenCalledWith(
			expect.objectContaining({ blocks: [{ type: "section" }] }),
		)
	})

	it("should pass thread_ts when --thread is provided", async () => {
		await runWhisper({ text: "hi", thread: "1234567890.123456" })
		expect(mockPostEphemeral).toHaveBeenCalledWith(
			expect.objectContaining({ thread_ts: "1234567890.123456" }),
		)
	})
})

describe("schedule command", () => {
	async function runSchedule(args: Record<string, unknown>) {
		const { scheduleCommand } = await import("../src/platforms/slack/chat/schedule.ts")
		await (scheduleCommand as any).run({
			args: { workspace: "test-ws", channel: "C001", at: "1700000000", ...args },
		})
	}

	it("should call normalizeSlackText (regression: zsh escaping)", async () => {
		await runSchedule({ text: "<\\!here> scheduled" })
		expect(mockScheduleMessage).toHaveBeenCalledWith(
			expect.objectContaining({ text: "<!here> scheduled" }),
		)
	})

	it("should call markdownToBlocks", async () => {
		await runSchedule({ text: "later" })
		expect(mockMarkdownToBlocks).toHaveBeenCalledWith("later")
		expect(mockScheduleMessage).toHaveBeenCalledWith(
			expect.objectContaining({ blocks: [{ type: "section" }] }),
		)
	})

	it("should pass post_at as a number", async () => {
		await runSchedule({ text: "later" })
		expect(mockScheduleMessage).toHaveBeenCalledWith(
			expect.objectContaining({ post_at: 1700000000 }),
		)
	})

	it("should pass thread_ts when --thread is provided", async () => {
		await runSchedule({ text: "hi", thread: "1234567890.123456" })
		expect(mockScheduleMessage).toHaveBeenCalledWith(
			expect.objectContaining({ thread_ts: "1234567890.123456" }),
		)
	})
})
