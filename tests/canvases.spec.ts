import { vi, beforeEach, afterEach } from "vitest"

const mockApiCall = vi.fn().mockResolvedValue({ ok: true, canvas_id: "F001", sections: [{ id: "sec1", type: "heading" }] })
const mockAuthTest = vi.fn().mockResolvedValue({ team_id: "T001", url: "https://test-ws.slack.com/" })
const mockFilesInfo = vi.fn().mockResolvedValue({
	ok: true,
	file: {
		id: "F001",
		title: "Test Canvas",
		url_private_download: "https://files.slack.com/download/canvas",
		created: 1700000000,
		updated: 1700001000,
	},
})

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		apiCall: (...a: unknown[]) => mockApiCall(...a),
		auth: { test: (...a: unknown[]) => mockAuthTest(...a) },
		files: { info: (...a: unknown[]) => mockFilesInfo(...a) },
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
// Canvases commands
// ──────────────────────────────────────────────

describe("canvases create", () => {
	async function run(args: Record<string, unknown>) {
		const { createCommand } = await import("../src/platforms/slack/canvases/create.ts")
		await (createCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.create with title and markdown", async () => {
		await run({ title: "My Canvas", markdown: "# Hello" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.create", {
			title: "My Canvas",
			document_content: { type: "markdown", markdown: "# Hello" },
		})
	})

	it("should call canvases.create with title only", async () => {
		await run({ title: "Empty Canvas" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.create", {
			title: "Empty Canvas",
		})
	})

	it("should print success message with canvas ID", async () => {
		await run({ title: "My Canvas" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
	})
})

describe("canvases edit", () => {
	async function run(args: Record<string, unknown>) {
		const { editCommand } = await import("../src/platforms/slack/canvases/edit.ts")
		await (editCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.edit with operation and markdown", async () => {
		await run({ canvas: "F001", operation: "insert_at_end", markdown: "# New section" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.edit", {
			canvas_id: "F001",
			changes: [{
				operation: "insert_at_end",
				document_content: { type: "markdown", markdown: "# New section" },
			}],
		})
	})

	it("should include section-id when provided", async () => {
		await run({ canvas: "F001", operation: "replace", markdown: "Updated", "section-id": "sec1" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.edit", {
			canvas_id: "F001",
			changes: [{
				operation: "replace",
				document_content: { type: "markdown", markdown: "Updated" },
				section_id: "sec1",
			}],
		})
	})

	it("should reject invalid operation", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
		await run({ canvas: "F001", operation: "invalid" }).catch(() => {})
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Invalid operation"))
		mockExit.mockRestore()
	})

	it("should print success message", async () => {
		await run({ canvas: "F001", operation: "insert_at_end", markdown: "text" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
	})
})

describe("canvases delete", () => {
	async function run(args: Record<string, unknown>) {
		const { deleteCommand } = await import("../src/platforms/slack/canvases/delete.ts")
		await (deleteCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.delete with canvas_id", async () => {
		await run({ canvas: "F001" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.delete", { canvas_id: "F001" })
	})

	it("should print success message", async () => {
		await run({ canvas: "F001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("deleted"))
	})
})

describe("canvases access-set", () => {
	async function run(args: Record<string, unknown>) {
		const { accessSetCommand } = await import("../src/platforms/slack/canvases/access-set.ts")
		await (accessSetCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.access.set with channel_ids", async () => {
		await run({ canvas: "F001", level: "read", channels: "#general" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.access.set", {
			canvas_id: "F001",
			access_level: "read",
			channel_ids: ["C001"],
		})
	})

	it("should call canvases.access.set with user_ids", async () => {
		await run({ canvas: "F001", level: "write", users: "@john" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.access.set", {
			canvas_id: "F001",
			access_level: "write",
			user_ids: ["U001"],
		})
	})

	it("should reject invalid access level", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
		await run({ canvas: "F001", level: "admin" }).catch(() => {})
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Invalid access level"))
		mockExit.mockRestore()
	})

	it("should print success message", async () => {
		await run({ canvas: "F001", level: "read", channels: "#general" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("read"))
	})
})

describe("canvases access-delete", () => {
	async function run(args: Record<string, unknown>) {
		const { accessDeleteCommand } = await import("../src/platforms/slack/canvases/access-delete.ts")
		await (accessDeleteCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.access.delete with channel_ids", async () => {
		await run({ canvas: "F001", channels: "#general" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.access.delete", {
			canvas_id: "F001",
			channel_ids: ["C001"],
		})
	})

	it("should call canvases.access.delete with user_ids", async () => {
		await run({ canvas: "F001", users: "@john" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.access.delete", {
			canvas_id: "F001",
			user_ids: ["U001"],
		})
	})

	it("should print success message", async () => {
		await run({ canvas: "F001", channels: "#general" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
	})
})

describe("canvases sections", () => {
	async function run(args: Record<string, unknown>) {
		const { sectionsCommand } = await import("../src/platforms/slack/canvases/sections.ts")
		await (sectionsCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call canvases.sections.lookup", async () => {
		await run({ canvas: "F001" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.sections.lookup", {
			canvas_id: "F001",
			criteria: {},
		})
	})

	it("should pass contains_text criteria", async () => {
		await run({ canvas: "F001", contains: "hello" })
		expect(mockApiCall).toHaveBeenCalledWith("canvases.sections.lookup", {
			canvas_id: "F001",
			criteria: { contains_text: "hello" },
		})
	})

	it("should print output", async () => {
		await run({ canvas: "F001" })
		expect(console.log).toHaveBeenCalled()
	})
})

describe("canvases read", () => {
	const originalFetch = globalThis.fetch

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	async function run(args: Record<string, unknown>) {
		const { readCommand } = await import("../src/platforms/slack/canvases/read.ts")
		await (readCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("should call files.info with canvas ID", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve("<h1>Title</h1><p>Hello world</p>"),
		})
		await run({ canvas: "F001" })
		expect(mockFilesInfo).toHaveBeenCalledWith({ file: "F001" })
	})

	it("should fetch download URL with auth header", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve("<p>content</p>"),
		})
		globalThis.fetch = mockFetch
		await run({ canvas: "F001" })
		expect(mockFetch).toHaveBeenCalledWith(
			"https://files.slack.com/download/canvas",
			{ headers: { Authorization: "Bearer xoxp-test" } },
		)
	})

	it("should output converted markdown", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve("<h2>Section</h2><p>Some <b>bold</b> text</p>"),
		})
		await run({ canvas: "F001" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("## Section"))
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("**bold**"))
	})

	it("should output JSON with metadata", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve("<p>Hello</p>"),
		})
		await run({ canvas: "F001", json: true })
		const output = (console.log as any).mock.calls[0][0]
		const parsed = JSON.parse(output)
		expect(parsed.id).toBe("F001")
		expect(parsed.title).toBe("Test Canvas")
		expect(parsed.markdown).toContain("Hello")
		expect(parsed.created).toBe(1700000000)
		expect(parsed.updated).toBe(1700001000)
	})

	it("should extract canvas ID from full Slack URL", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve("<p>content</p>"),
		})
		await run({ canvas: "https://meltenai.slack.com/docs/T0ACNQU4D71/F0AEELPRSUX" })
		expect(mockFilesInfo).toHaveBeenCalledWith({ file: "F0AEELPRSUX" })
	})

	it("should convert tables to markdown", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			text: () => Promise.resolve(
				"<table><tr><td>Name</td><td>Value</td></tr><tr><td>A</td><td>1</td></tr></table>",
			),
		})
		await run({ canvas: "F001" })
		const output = (console.log as any).mock.calls[0][0]
		expect(output).toContain("| Name | Value |")
		expect(output).toContain("| A | 1 |")
	})
})
