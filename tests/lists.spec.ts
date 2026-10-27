import { vi, beforeEach, afterEach, describe, expect, it } from "vitest"

const mockApiCall = vi.fn()

type TestCommand = {
	run: (context: { args: Record<string, unknown> }) => Promise<void>
}

async function runCommand(command: unknown, args: Record<string, unknown>): Promise<void> {
	await (command as TestCommand).run({ args })
}

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		apiCall: (...args: unknown[]) => mockApiCall(...args),
	})),
}))

beforeEach(() => {
	mockApiCall.mockReset().mockResolvedValue({ ok: true })
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("Slack Lists commands", () => {
	it("reads items from a List URL", async () => {
		mockApiCall.mockResolvedValueOnce({
			items: [{ id: "Rec001", fields: [{ text: "Sequential equivalence checking" }] }],
			response_metadata: { next_cursor: "" },
		})
		const { readCommand } = await import("../src/platforms/slack/lists/read.ts")

		await runCommand(readCommand, {
			workspace: "test-ws",
			list: "https://meltenai.slack.com/lists/T001/F001",
			json: false,
		})

		expect(mockApiCall).toHaveBeenCalledWith("slackLists.items.list", {
			list_id: "F001",
		})
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Sequential equivalence checking"))
	})

	it("auto-paginates with --all", async () => {
		mockApiCall
			.mockResolvedValueOnce({
				items: [{ id: "Rec001", fields: [{ text: "One" }] }],
				response_metadata: { next_cursor: "next" },
			})
			.mockResolvedValueOnce({
				items: [{ id: "Rec002", fields: [{ text: "Two" }] }],
				response_metadata: { next_cursor: "" },
			})
		const { readCommand } = await import("../src/platforms/slack/lists/read.ts")

		await runCommand(readCommand, { workspace: "test-ws", list: "F001", all: true, limit: "100" })

		expect(mockApiCall).toHaveBeenNthCalledWith(1, "slackLists.items.list", {
			list_id: "F001",
			limit: 100,
		})
		expect(mockApiCall).toHaveBeenNthCalledWith(2, "slackLists.items.list", {
			list_id: "F001",
			limit: 100,
			cursor: "next",
		})
	})

	it("creates a List", async () => {
		mockApiCall.mockResolvedValueOnce({ ok: true, list_id: "F001" })
		const { createCommand } = await import("../src/platforms/slack/lists/create.ts")

		await runCommand(createCommand, { workspace: "test-ws", name: "Publication Schedule" })

		expect(mockApiCall).toHaveBeenCalledWith("slackLists.create", { name: "Publication Schedule" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("F001"))
	})

	it("adds an item with typed fields", async () => {
		const fields = [{ column_id: "Col001", rich_text: [{ type: "rich_text" }] }]
		const { addCommand } = await import("../src/platforms/slack/lists/add.ts")

		await runCommand(addCommand, { workspace: "test-ws", list: "F001", fields: JSON.stringify(fields) })

		expect(mockApiCall).toHaveBeenCalledWith("slackLists.items.create", {
			list_id: "F001",
			initial_fields: fields,
		})
	})

	it("updates an item and fills the fallback row ID", async () => {
		const fields = [{ column_id: "Col001", select: ["Opt001"] }]
		const { updateCommand } = await import("../src/platforms/slack/lists/update.ts")

		await runCommand(updateCommand, {
			workspace: "test-ws",
			list: "F001",
			row: "Rec001",
			fields: JSON.stringify(fields),
		})

		expect(mockApiCall).toHaveBeenCalledWith("slackLists.items.update", {
			list_id: "F001",
			cells: [{ column_id: "Col001", select: ["Opt001"], row_id: "Rec001" }],
		})
	})

	it("deletes an item", async () => {
		const { deleteCommand } = await import("../src/platforms/slack/lists/delete.ts")

		await runCommand(deleteCommand, { workspace: "test-ws", list: "F001", row: "Rec001" })

		expect(mockApiCall).toHaveBeenCalledWith("slackLists.items.delete", {
			list_id: "F001",
			id: "Rec001",
		})
	})

	it("rejects malformed fields JSON", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("process.exit")
		})
		const { addCommand } = await import("../src/platforms/slack/lists/add.ts")

		await expect(
			runCommand(addCommand, { workspace: "test-ws", list: "F001", fields: "not-json" }),
		).rejects.toThrow("process.exit")
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("must be valid JSON"))
		mockExit.mockRestore()
	})
})
