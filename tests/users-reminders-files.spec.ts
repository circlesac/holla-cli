import { vi, beforeEach } from "vitest"

/* ── mock fns ─────────────────────────────────────────────── */
const mockLookupByEmail = vi.fn()
const mockUsersInfo = vi.fn()
const mockGetPresence = vi.fn()
const mockProfileGet = vi.fn()
const mockSetPresence = vi.fn()
const mockProfileSet = vi.fn()

const mockRemindersAdd = vi.fn()
const mockRemindersComplete = vi.fn()
const mockRemindersDelete = vi.fn()
const mockRemindersInfo = vi.fn()
const mockRemindersList = vi.fn()

const mockFilesDelete = vi.fn()
const mockFilesInfo = vi.fn()
const mockFilesUploadV2 = vi.fn()

/* ── mocks ────────────────────────────────────────────────── */
vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		users: {
			lookupByEmail: (...a: unknown[]) => mockLookupByEmail(...a),
			info: (...a: unknown[]) => mockUsersInfo(...a),
			getPresence: (...a: unknown[]) => mockGetPresence(...a),
			setPresence: (...a: unknown[]) => mockSetPresence(...a),
			profile: {
				get: (...a: unknown[]) => mockProfileGet(...a),
				set: (...a: unknown[]) => mockProfileSet(...a),
			},
		},
		reminders: {
			add: (...a: unknown[]) => mockRemindersAdd(...a),
			complete: (...a: unknown[]) => mockRemindersComplete(...a),
			delete: (...a: unknown[]) => mockRemindersDelete(...a),
			info: (...a: unknown[]) => mockRemindersInfo(...a),
			list: (...a: unknown[]) => mockRemindersList(...a),
		},
		files: {
			delete: (...a: unknown[]) => mockFilesDelete(...a),
			info: (...a: unknown[]) => mockFilesInfo(...a),
		},
		filesUploadV2: (...a: unknown[]) => mockFilesUploadV2(...a),
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

/* ════════════════════════════════════════════════════════════
   USERS
   ════════════════════════════════════════════════════════════ */

describe("users find", () => {
	async function run(args: Record<string, unknown>) {
		const { findCommand } = await import("../src/platforms/slack/users/find.ts")
		await (findCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call lookupByEmail with the email arg", async () => {
		mockLookupByEmail.mockResolvedValueOnce({
			user: { id: "U123", name: "jdoe", real_name: "Jane", profile: { display_name: "Jane D", email: "jane@co.com" } },
		})
		await run({ email: "jane@co.com" })
		expect(mockLookupByEmail).toHaveBeenCalledWith({ email: "jane@co.com" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("U123"))
	})

	it("should output JSON when --json is set", async () => {
		mockLookupByEmail.mockResolvedValueOnce({
			user: { id: "U123", name: "jdoe" },
		})
		await run({ email: "jane@co.com", json: true })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"id"'))
	})
})

describe("users info", () => {
	async function run(args: Record<string, unknown>) {
		const { infoCommand } = await import("../src/platforms/slack/users/info.ts")
		await (infoCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should resolve user and call users.info", async () => {
		mockUsersInfo.mockResolvedValueOnce({
			user: {
				id: "U001", name: "bob", real_name: "Bob", tz: "US/Eastern",
				is_admin: false, is_bot: false,
				profile: { display_name: "Bobby", email: "bob@co.com" },
			},
		})
		await run({ user: "@bob" })
		expect(mockUsersInfo).toHaveBeenCalledWith({ user: "U001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Bob"))
	})

	it("should output JSON when --json is set", async () => {
		mockUsersInfo.mockResolvedValueOnce({
			user: { id: "U001", name: "bob" },
		})
		await run({ user: "@bob", json: true })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"id"'))
	})
})

describe("users presence", () => {
	async function run(args: Record<string, unknown>) {
		const { presenceCommand } = await import("../src/platforms/slack/users/presence.ts")
		await (presenceCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should resolve user and call getPresence", async () => {
		mockGetPresence.mockResolvedValueOnce({ presence: "active", online: true, auto_away: false })
		await run({ user: "@alice" })
		expect(mockGetPresence).toHaveBeenCalledWith({ user: "U001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("active"))
	})

	it("should output JSON when --json is set", async () => {
		mockGetPresence.mockResolvedValueOnce({ presence: "away" })
		await run({ user: "@alice", json: true })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining('"presence"'))
	})
})

describe("users profile", () => {
	async function run(args: Record<string, unknown>) {
		const { profileCommand } = await import("../src/platforms/slack/users/profile.ts")
		await (profileCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call profile.get without user param when none provided", async () => {
		mockProfileGet.mockResolvedValueOnce({
			profile: { real_name: "Me", display_name: "me", email: "me@co.com", phone: "", title: "Dev" },
		})
		await run({})
		expect(mockProfileGet).toHaveBeenCalledWith({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Me"))
	})

	it("should resolve user when --user is provided", async () => {
		mockProfileGet.mockResolvedValueOnce({
			profile: { real_name: "Other", display_name: "other" },
		})
		await run({ user: "@other" })
		expect(mockProfileGet).toHaveBeenCalledWith({ user: "U001" })
	})
})

describe("users set-presence", () => {
	async function run(args: Record<string, unknown>) {
		const { setPresenceCommand } = await import("../src/platforms/slack/users/set-presence.ts")
		await (setPresenceCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call setPresence with 'auto'", async () => {
		mockSetPresence.mockResolvedValueOnce({ ok: true })
		await run({ presence: "auto" })
		expect(mockSetPresence).toHaveBeenCalledWith({ presence: "auto" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("auto"))
	})

	it("should reject invalid presence value", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit")
		})
		await expect(run({ presence: "busy" })).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining('"auto" or "away"'))
		mockExit.mockRestore()
	})
})

describe("users set-profile", () => {
	async function run(args: Record<string, unknown>) {
		const { setProfileCommand } = await import("../src/platforms/slack/users/set-profile.ts")
		await (setProfileCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should set display name", async () => {
		mockProfileSet.mockResolvedValueOnce({ ok: true })
		await run({ "display-name": "NewName" })
		expect(mockProfileSet).toHaveBeenCalledWith({ profile: { display_name: "NewName" } })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Profile updated"))
	})

	it("should error when no profile fields provided", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit")
		})
		await expect(run({})).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("At least one profile field"))
		mockExit.mockRestore()
	})
})

/* ════════════════════════════════════════════════════════════
   REMINDERS
   ════════════════════════════════════════════════════════════ */

describe("reminders add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/reminders/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call reminders.add with text and time", async () => {
		mockRemindersAdd.mockResolvedValueOnce({ reminder: { id: "Rm001" } })
		await run({ text: "standup", time: "in 5 minutes" })
		expect(mockRemindersAdd).toHaveBeenCalledWith({ text: "standup", time: "in 5 minutes" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Rm001"))
	})
})

describe("reminders complete", () => {
	async function run(args: Record<string, unknown>) {
		const { completeCommand } = await import("../src/platforms/slack/reminders/complete.ts")
		await (completeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call reminders.complete with reminder ID", async () => {
		mockRemindersComplete.mockResolvedValueOnce({ ok: true })
		await run({ reminder: "Rm001" })
		expect(mockRemindersComplete).toHaveBeenCalledWith({ reminder: "Rm001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Rm001"))
	})
})

describe("reminders delete", () => {
	async function run(args: Record<string, unknown>) {
		const { deleteCommand } = await import("../src/platforms/slack/reminders/delete.ts")
		await (deleteCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call reminders.delete with reminder ID", async () => {
		mockRemindersDelete.mockResolvedValueOnce({ ok: true })
		await run({ reminder: "Rm002" })
		expect(mockRemindersDelete).toHaveBeenCalledWith({ reminder: "Rm002" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Rm002"))
	})
})

describe("reminders info", () => {
	async function run(args: Record<string, unknown>) {
		const { infoCommand } = await import("../src/platforms/slack/reminders/info.ts")
		await (infoCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call reminders.info and output via printOutput", async () => {
		mockRemindersInfo.mockResolvedValueOnce({
			reminder: { id: "Rm003", text: "review PR", creator: "U001", user: "U001", time: 1700000000, complete_ts: 0, recurring: false },
		})
		await run({ reminder: "Rm003" })
		expect(mockRemindersInfo).toHaveBeenCalledWith({ reminder: "Rm003" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("reminders list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/reminders/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call reminders.list and output via printOutput", async () => {
		mockRemindersList.mockResolvedValueOnce({
			reminders: [
				{ id: "Rm1", text: "a", time: 100, complete_ts: 0 },
				{ id: "Rm2", text: "b", time: 200, complete_ts: 0 },
			],
		})
		await run({})
		expect(mockRemindersList).toHaveBeenCalled()
		expect(console.log).toHaveBeenCalled()
	})
})

/* ════════════════════════════════════════════════════════════
   FILES
   ════════════════════════════════════════════════════════════ */

describe("files delete", () => {
	async function run(args: Record<string, unknown>) {
		const { deleteCommand } = await import("../src/platforms/slack/files/delete.ts")
		await (deleteCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call files.delete with file ID", async () => {
		mockFilesDelete.mockResolvedValueOnce({ ok: true })
		await run({ file: "F001" })
		expect(mockFilesDelete).toHaveBeenCalledWith({ file: "F001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
	})
})

describe("files info", () => {
	async function run(args: Record<string, unknown>) {
		const { infoCommand } = await import("../src/platforms/slack/files/info.ts")
		await (infoCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call files.info and output via printOutput", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: {
				id: "F002", name: "doc.pdf", title: "Doc", filetype: "pdf",
				size: 1024, user: "U001", created: 1700000000, timestamp: 1700000000,
				url_private: "https://x", permalink: "https://y",
				channels: ["C001"], groups: [], ims: [],
			},
		})
		await run({ file: "F002" })
		expect(mockFilesInfo).toHaveBeenCalledWith({ file: "F002" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("files upload", () => {
	async function run(args: Record<string, unknown>) {
		const { uploadCommand } = await import("../src/platforms/slack/files/upload.ts")
		await (uploadCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	beforeEach(() => {
		vi.stubGlobal("Bun", {
			file: vi.fn(() => ({
				arrayBuffer: () => Promise.resolve(new ArrayBuffer(100)),
			})),
		})
	})

	it("should upload file via filesUploadV2", async () => {
		mockFilesUploadV2.mockResolvedValueOnce({ ok: true })
		await run({ file: "/tmp/test.txt" })
		expect(mockFilesUploadV2).toHaveBeenCalledWith(
			expect.objectContaining({
				filename: "test.txt",
				file: expect.any(Buffer),
			}),
		)
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("test.txt"))
	})

	it("should resolve channel and pass channel_id when --channel is provided", async () => {
		mockFilesUploadV2.mockResolvedValueOnce({ ok: true })
		await run({ file: "/tmp/test.txt", channel: "#general", title: "My File", message: "Here it is" })
		expect(mockFilesUploadV2).toHaveBeenCalledWith(
			expect.objectContaining({
				channel_id: "C001",
				title: "My File",
				initial_comment: "Here it is",
			}),
		)
	})
})
