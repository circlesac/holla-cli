import { vi, beforeEach, afterEach } from "vitest"

const mockEndDnd = vi.fn().mockResolvedValue({ ok: true })
const mockSetSnooze = vi.fn().mockResolvedValue({ ok: true })
const mockDndInfo = vi.fn().mockResolvedValue({
	dnd_enabled: true,
	next_dnd_start_ts: 1700000000,
	next_dnd_end_ts: 1700036000,
	snooze_enabled: false,
	snooze_endtime: 0,
	snooze_remaining: 0,
})
const mockDndTeamInfo = vi.fn().mockResolvedValue({
	users: {
		U001: { dnd_enabled: true, next_dnd_start_ts: 1700000000, next_dnd_end_ts: 1700036000 },
		U002: { dnd_enabled: false, next_dnd_start_ts: 0, next_dnd_end_ts: 0 },
	},
})
const mockEndSnooze = vi.fn().mockResolvedValue({ ok: true })
const mockEmojiList = vi.fn().mockResolvedValue({
	emoji: { thumbsup: "https://emoji.slack.com/thumbsup.png", wave: "https://emoji.slack.com/wave.png" },
})
const mockUsergroupsCreate = vi.fn().mockResolvedValue({
	usergroup: { id: "S001", name: "Engineering" },
})
const mockUsergroupsDisable = vi.fn().mockResolvedValue({ ok: true })
const mockUsergroupsEnable = vi.fn().mockResolvedValue({ ok: true })
const mockAuthTest = vi.fn().mockResolvedValue({ user_id: "U001" })
const mockUsergroupsList = vi.fn().mockResolvedValue({
	usergroups: [
		{ id: "S001", name: "Engineering", handle: "eng", description: "Engineering team", users: ["U001", "U002"] },
	],
})
const mockUsergroupsUsersList = vi.fn().mockResolvedValue({ users: ["U001", "U002"] })
const mockUsergroupsUsersUpdate = vi.fn().mockResolvedValue({ ok: true })
const mockUsergroupsUpdate = vi.fn().mockResolvedValue({ ok: true })
const mockTeamInfo = vi.fn().mockResolvedValue({
	team: { id: "T001", name: "Test Team", domain: "test", email_domain: "test.com", icon: { image_68: "https://icon.png" } },
})
const mockTeamProfileGet = vi.fn().mockResolvedValue({
	profile: {
		fields: [
			{ id: "Xf001", label: "Phone", type: "text", hint: "Enter phone", ordering: 0 },
		],
	},
})

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		dnd: {
			endDnd: (...a: unknown[]) => mockEndDnd(...a),
			setSnooze: (...a: unknown[]) => mockSetSnooze(...a),
			info: (...a: unknown[]) => mockDndInfo(...a),
			teamInfo: (...a: unknown[]) => mockDndTeamInfo(...a),
			endSnooze: (...a: unknown[]) => mockEndSnooze(...a),
		},
		emoji: {
			list: (...a: unknown[]) => mockEmojiList(...a),
		},
		usergroups: {
			create: (...a: unknown[]) => mockUsergroupsCreate(...a),
			disable: (...a: unknown[]) => mockUsergroupsDisable(...a),
			enable: (...a: unknown[]) => mockUsergroupsEnable(...a),
			list: (...a: unknown[]) => mockUsergroupsList(...a),
			update: (...a: unknown[]) => mockUsergroupsUpdate(...a),
			users: {
				list: (...a: unknown[]) => mockUsergroupsUsersList(...a),
				update: (...a: unknown[]) => mockUsergroupsUsersUpdate(...a),
			},
		},
		auth: {
			test: (...a: unknown[]) => mockAuthTest(...a),
		},
		team: {
			info: (...a: unknown[]) => mockTeamInfo(...a),
			profile: {
				get: (...a: unknown[]) => mockTeamProfileGet(...a),
			},
		},
	})),
}))

vi.mock("../src/platforms/slack/resolve.ts", () => ({
	resolveChannel: vi.fn().mockResolvedValue("C001"),
	resolveUser: vi.fn().mockResolvedValue("U001"),
	resolveUserName: vi.fn().mockResolvedValue("john"),
	resolveGroup: vi.fn().mockResolvedValue({ id: "S001", name: "Engineering", handle: "eng" }),
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
// DND commands
// ──────────────────────────────────────────────

describe("dnd end", () => {
	async function run(args: Record<string, unknown>) {
		const { endCommand } = await import("../src/platforms/slack/dnd/end.ts")
		await (endCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call dnd.endDnd", async () => {
		await run({})
		expect(mockEndDnd).toHaveBeenCalledTimes(1)
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("DND mode ended"))
	})
})

describe("dnd snooze", () => {
	async function run(args: Record<string, unknown>) {
		const { snoozeCommand } = await import("../src/platforms/slack/dnd/snooze.ts")
		await (snoozeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call dnd.setSnooze with num_minutes", async () => {
		await run({ minutes: "30" })
		expect(mockSetSnooze).toHaveBeenCalledWith({ num_minutes: 30 })
	})

	it("should print success message with minutes", async () => {
		await run({ minutes: "60" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("60 minutes"))
	})

	it("should reject non-positive minutes", async () => {
		const exitError = new Error("process.exit")
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw exitError })
		await run({ minutes: "0" }).catch(() => {})
		expect(mockSetSnooze).not.toHaveBeenCalled()
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("positive number"))
		mockExit.mockRestore()
	})

	it("should reject non-numeric minutes", async () => {
		const exitError = new Error("process.exit")
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw exitError })
		await run({ minutes: "abc" }).catch(() => {})
		expect(mockSetSnooze).not.toHaveBeenCalled()
		mockExit.mockRestore()
	})
})

describe("dnd status", () => {
	async function run(args: Record<string, unknown>) {
		const { statusCommand } = await import("../src/platforms/slack/dnd/status.ts")
		await (statusCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call dnd.info without user param by default", async () => {
		await run({})
		expect(mockDndInfo).toHaveBeenCalledWith({})
	})

	it("should resolve and pass user param", async () => {
		await run({ user: "@john" })
		expect(mockDndInfo).toHaveBeenCalledWith({ user: "U001" })
	})
})

describe("dnd team", () => {
	async function run(args: Record<string, unknown>) {
		const { teamCommand } = await import("../src/platforms/slack/dnd/team.ts")
		await (teamCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call dnd.teamInfo with comma-separated users", async () => {
		await run({ users: "U001,U002" })
		expect(mockDndTeamInfo).toHaveBeenCalledWith({ users: "U001,U002" })
	})

	it("should print output for each user", async () => {
		await run({ users: "U001,U002" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("dnd unsnooze", () => {
	async function run(args: Record<string, unknown>) {
		const { unsnoozeCommand } = await import("../src/platforms/slack/dnd/unsnooze.ts")
		await (unsnoozeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call dnd.endSnooze", async () => {
		await run({})
		expect(mockEndSnooze).toHaveBeenCalledTimes(1)
	})

	it("should print success message", async () => {
		await run({})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("DND snooze ended"))
	})
})

// ──────────────────────────────────────────────
// Emoji commands
// ──────────────────────────────────────────────

describe("emoji list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/emoji/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call emoji.list", async () => {
		await run({})
		expect(mockEmojiList).toHaveBeenCalledTimes(1)
	})

	it("should print output", async () => {
		await run({})
		expect(console.log).toHaveBeenCalled()
	})
})

// ──────────────────────────────────────────────
// Groups (usergroups) commands
// ──────────────────────────────────────────────

describe("groups create", () => {
	async function run(args: Record<string, unknown>) {
		const { createCommand } = await import("../src/platforms/slack/groups/create.ts")
		await (createCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.create with name only", async () => {
		await run({ name: "Engineering" })
		expect(mockUsergroupsCreate).toHaveBeenCalledWith({ name: "Engineering" })
	})

	it("should pass optional handle and description", async () => {
		await run({ name: "Engineering", handle: "eng", description: "Eng team" })
		expect(mockUsergroupsCreate).toHaveBeenCalledWith({
			name: "Engineering",
			handle: "eng",
			description: "Eng team",
		})
	})

	it("should print success message with group name and ID", async () => {
		await run({ name: "Engineering" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("S001"))
	})
})

describe("groups disable", () => {
	async function run(args: Record<string, unknown>) {
		const { disableCommand } = await import("../src/platforms/slack/groups/disable.ts")
		await (disableCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.disable with usergroup", async () => {
		await run({ group: "S001" })
		expect(mockUsergroupsDisable).toHaveBeenCalledWith({ usergroup: "S001" })
	})

	it("should print success message", async () => {
		await run({ group: "S001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("disabled"))
	})
})

describe("groups enable", () => {
	async function run(args: Record<string, unknown>) {
		const { enableCommand } = await import("../src/platforms/slack/groups/enable.ts")
		await (enableCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.enable with usergroup", async () => {
		await run({ group: "S001" })
		expect(mockUsergroupsEnable).toHaveBeenCalledWith({ usergroup: "S001" })
	})

	it("should print success message", async () => {
		await run({ group: "S001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("enabled"))
	})
})

describe("groups list", () => {
	async function run(args: Record<string, unknown>) {
		const { listCommand } = await import("../src/platforms/slack/groups/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should default to showing only my groups", async () => {
		await run({})
		expect(mockUsergroupsList).toHaveBeenCalledWith({ include_users: true })
		expect(mockAuthTest).toHaveBeenCalled()
		expect(console.log).toHaveBeenCalled()
	})

	it("should show all groups when --all is set", async () => {
		await run({ all: true })
		expect(mockUsergroupsList).toHaveBeenCalledWith({ include_users: false })
		expect(mockAuthTest).not.toHaveBeenCalled()
	})
})

describe("groups members", () => {
	async function run(args: Record<string, unknown>) {
		const { membersCommand } = await import("../src/platforms/slack/groups/members.ts")
		await (membersCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.users.list with usergroup", async () => {
		await run({ group: "S001" })
		expect(mockUsergroupsUsersList).toHaveBeenCalledWith({ usergroup: "S001" })
	})

	it("should print output", async () => {
		await run({ group: "S001" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("groups set-members", () => {
	async function run(args: Record<string, unknown>) {
		const { setMembersCommand } = await import("../src/platforms/slack/groups/set-members.ts")
		await (setMembersCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.users.update with usergroup and users", async () => {
		await run({ group: "S001", users: "U001,U002" })
		expect(mockUsergroupsUsersUpdate).toHaveBeenCalledWith({ usergroup: "S001", users: "U001,U002" })
	})

	it("should print success message", async () => {
		await run({ group: "S001", users: "U001,U002" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Members updated"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
	})
})

describe("groups update", () => {
	async function run(args: Record<string, unknown>) {
		const { updateCommand } = await import("../src/platforms/slack/groups/update.ts")
		await (updateCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call usergroups.update with usergroup only", async () => {
		await run({ group: "S001" })
		expect(mockUsergroupsUpdate).toHaveBeenCalledWith({ usergroup: "S001" })
	})

	it("should pass optional name, handle, description", async () => {
		await run({ group: "S001", name: "NewName", handle: "new", description: "Updated" })
		expect(mockUsergroupsUpdate).toHaveBeenCalledWith({
			usergroup: "S001",
			name: "NewName",
			handle: "new",
			description: "Updated",
		})
	})

	it("should print success message", async () => {
		await run({ group: "S001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("updated"))
	})
})

describe("groups add-member", () => {
	async function run(args: Record<string, unknown>) {
		const { addMemberCommand } = await import("../src/platforms/slack/groups/add-member.ts")
		await (addMemberCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should add user to group", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U002"] })
		await run({ group: "S001", user: "@john" })
		expect(mockUsergroupsUsersUpdate).toHaveBeenCalledWith({ usergroup: "S001", users: "U002,U001" })
	})

	it("should skip if user is already a member", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U001", "U002"] })
		await run({ group: "S001", user: "@john" })
		expect(mockUsergroupsUsersUpdate).not.toHaveBeenCalled()
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("already a member"))
	})

	it("should print success message with group name", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U002"] })
		await run({ group: "S001", user: "@john" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
	})
})

describe("groups remove-member", () => {
	async function run(args: Record<string, unknown>) {
		const { removeMemberCommand } = await import("../src/platforms/slack/groups/remove-member.ts")
		await (removeMemberCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should remove user from group", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U001", "U002"] })
		await run({ group: "S001", user: "@john" })
		expect(mockUsergroupsUsersUpdate).toHaveBeenCalledWith({ usergroup: "S001", users: "U002" })
	})

	it("should skip if user is not a member", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U002"] })
		await run({ group: "S001", user: "@john" })
		expect(mockUsergroupsUsersUpdate).not.toHaveBeenCalled()
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("not a member"))
	})

	it("should print success message with group name", async () => {
		mockUsergroupsUsersList.mockResolvedValueOnce({ users: ["U001", "U002"] })
		await run({ group: "S001", user: "@john" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Engineering"))
	})
})

// ──────────────────────────────────────────────
// Auth commands
// ──────────────────────────────────────────────

describe("auth whoami", () => {
	async function run(args: Record<string, unknown>) {
		const { whoamiCommand } = await import("../src/platforms/slack/auth/whoami.ts")
		await (whoamiCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call auth.test", async () => {
		await run({})
		expect(mockAuthTest).toHaveBeenCalledTimes(1)
	})

	it("should print output", async () => {
		await run({})
		expect(console.log).toHaveBeenCalled()
	})
})

// ──────────────────────────────────────────────
// Team commands
// ──────────────────────────────────────────────

describe("team info", () => {
	async function run(args: Record<string, unknown>) {
		const { infoCommand } = await import("../src/platforms/slack/team/info.ts")
		await (infoCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call team.info", async () => {
		await run({})
		expect(mockTeamInfo).toHaveBeenCalledTimes(1)
	})

	it("should print output", async () => {
		await run({})
		expect(console.log).toHaveBeenCalled()
	})
})

describe("team profile", () => {
	async function run(args: Record<string, unknown>) {
		const { profileCommand } = await import("../src/platforms/slack/team/profile.ts")
		await (profileCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call team.profile.get", async () => {
		await run({})
		expect(mockTeamProfileGet).toHaveBeenCalledTimes(1)
	})

	it("should print output", async () => {
		await run({})
		expect(console.log).toHaveBeenCalled()
	})
})
