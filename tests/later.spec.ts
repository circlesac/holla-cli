import { vi, beforeEach, afterEach, describe, it, expect } from "vitest"

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

vi.mock("../src/lib/credentials.ts", () => ({
	getBrowserCredentials: vi.fn().mockResolvedValue({
		browserToken: "xoxc-test-token",
		browserCookie: "test-cookie",
		workspace: "test-ws",
	}),
}))

const mockPrintOutput = vi.fn()
const mockGetOutputFormat = vi.fn().mockReturnValue("json")

vi.mock("../src/lib/output.ts", () => ({
	printOutput: (...args: unknown[]) => mockPrintOutput(...args),
	getOutputFormat: (...args: unknown[]) => mockGetOutputFormat(...args),
}))

function mockFetchResponse(data: Record<string, unknown>) {
	mockFetch.mockResolvedValueOnce({
		json: () => Promise.resolve(data),
	})
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

// ── parseTimeExpression ─────────────────────────────────────

describe("parseTimeExpression", () => {
	let parseTimeExpression: (input: string) => string

	beforeEach(async () => {
		const mod = await import("../src/platforms/slack/later/update.ts")
		parseTimeExpression = mod.parseTimeExpression
	})

	it("returns '0' for '0'", () => {
		expect(parseTimeExpression("0")).toBe("0")
	})

	it("returns '0' for 'clear'", () => {
		expect(parseTimeExpression("clear")).toBe("0")
	})

	it("passes through a 10-digit unix timestamp", () => {
		expect(parseTimeExpression("1774224000")).toBe("1774224000")
	})

	it("parses '30m' as ~30 minutes from now", () => {
		const before = Math.floor(Date.now() / 1000) + 30 * 60
		const result = parseInt(parseTimeExpression("30m"))
		const after = Math.floor(Date.now() / 1000) + 30 * 60
		expect(result).toBeGreaterThanOrEqual(before - 1)
		expect(result).toBeLessThanOrEqual(after + 1)
	})

	it("parses '30 mins' as ~30 minutes from now", () => {
		const expected = Math.floor(Date.now() / 1000) + 30 * 60
		const result = parseInt(parseTimeExpression("30 mins"))
		expect(Math.abs(result - expected)).toBeLessThanOrEqual(2)
	})

	it("parses '1h' as ~1 hour from now", () => {
		const expected = Math.floor(Date.now() / 1000) + 3600
		const result = parseInt(parseTimeExpression("1h"))
		expect(Math.abs(result - expected)).toBeLessThanOrEqual(2)
	})

	it("parses '2 hours' as ~2 hours from now", () => {
		const expected = Math.floor(Date.now() / 1000) + 7200
		const result = parseInt(parseTimeExpression("2 hours"))
		expect(Math.abs(result - expected)).toBeLessThanOrEqual(2)
	})

	it("parses '3d' as ~3 days from now", () => {
		const expected = Math.floor(Date.now() / 1000) + 3 * 86400
		const result = parseInt(parseTimeExpression("3d"))
		expect(Math.abs(result - expected)).toBeLessThanOrEqual(2)
	})

	it("parses 'tomorrow' as tomorrow 9:00 AM local", () => {
		const d = new Date()
		d.setDate(d.getDate() + 1)
		d.setHours(9, 0, 0, 0)
		const expected = Math.floor(d.getTime() / 1000)
		expect(parseInt(parseTimeExpression("tomorrow"))).toBe(expected)
	})

	it("parses day names as next occurrence at 9:00 AM", () => {
		const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
		for (const day of days) {
			const result = parseInt(parseTimeExpression(day))
			const resultDate = new Date(result * 1000)
			expect(resultDate.getHours()).toBe(9)
			expect(resultDate.getMinutes()).toBe(0)
			expect(days[resultDate.getDay()]).toBe(day)
		}
	})

	it("passes through other numeric strings", () => {
		expect(parseTimeExpression("12345")).toBe("12345")
	})

	it("throws on unparseable input", () => {
		expect(() => parseTimeExpression("next week")).toThrow("Cannot parse time expression")
	})
})

// ── callSavedApi ────────────────────────────────────────────

describe("callSavedApi", () => {
	let callSavedApi: Function

	beforeEach(async () => {
		const mod = await import("../src/platforms/slack/later/list.ts")
		callSavedApi = mod.callSavedApi
	})

	it("sends POST with token and params to correct URL", async () => {
		mockFetchResponse({ ok: true, saved_items: [] })

		await callSavedApi("test-ws", "saved.list", "xoxc-tok", "cookie-val", { filter: "saved" })

		expect(mockFetch).toHaveBeenCalledWith(
			"https://test-ws.slack.com/api/saved.list",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({
					"Content-Type": "application/x-www-form-urlencoded",
					Cookie: "d=cookie-val",
				}),
			}),
		)

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("token")).toBe("xoxc-tok")
		expect(params.get("filter")).toBe("saved")
	})

	it("throws on non-ok response", async () => {
		mockFetchResponse({ ok: false, error: "not_authed" })
		await expect(callSavedApi("ws", "saved.list", "tok", "ck", {})).rejects.toThrow("not_authed")
	})
})

// ── later list ──────────────────────────────────────────────

describe("later list", () => {
	async function run(args: Record<string, unknown> = {}) {
		const { listCommand } = await import("../src/platforms/slack/later/list.ts")
		await (listCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls saved.list and outputs rows with date_snoozed_until", async () => {
		mockFetchResponse({
			ok: true,
			saved_items: [
				{
					item_id: "C001",
					item_type: "message",
					ts: "111.222",
					state: "in_progress",
					date_created: 1700000000,
					date_due: 1700100000,
					date_snoozed_until: 1700200000,
				},
			],
		})

		await run()

		expect(mockPrintOutput).toHaveBeenCalledWith(
			[
				expect.objectContaining({
					item_id: "C001",
					type: "message",
					ts: "111.222",
					state: "in_progress",
					date_snoozed_until: new Date(1700200000 * 1000).toISOString(),
				}),
			],
			expect.anything(),
			expect.arrayContaining([
				expect.objectContaining({ key: "date_snoozed_until", label: "Snoozed Until" }),
			]),
		)
	})

	it("rejects --limit exceeding 50", async () => {
		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("exit") })
		await expect(run({ limit: "51" })).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(expect.stringContaining("cannot exceed 50"))
		mockExit.mockRestore()
	})

	it("outputs empty string for missing date_snoozed_until", async () => {
		mockFetchResponse({
			ok: true,
			saved_items: [
				{
					item_id: "C002",
					item_type: "message",
					ts: "222.333",
					state: "in_progress",
					date_created: 1700000000,
				},
			],
		})

		await run()

		expect(mockPrintOutput).toHaveBeenCalledWith(
			[expect.objectContaining({ date_snoozed_until: "", date_due: "" })],
			expect.anything(),
			expect.anything(),
		)
	})
})

// ── later add ───────────────────────────────────────────────

describe("later add", () => {
	async function run(args: Record<string, unknown>) {
		const { addCommand } = await import("../src/platforms/slack/later/add.ts")
		await (addCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls saved.add with item_type, item_id, ts", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("item_type")).toBe("message")
		expect(params.get("item_id")).toBe("C001")
		expect(params.get("ts")).toBe("111.222")
		expect(mockFetch.mock.calls[0][0]).toContain("saved.add")
	})

	it("prints success message", async () => {
		mockFetchResponse({ ok: true })
		await run({ "item-id": "C001", ts: "111.222" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Added to Later"))
	})
})

// ── later remove ────────────────────────────────────────────

describe("later remove", () => {
	async function run(args: Record<string, unknown>) {
		const { removeCommand } = await import("../src/platforms/slack/later/remove.ts")
		await (removeCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls saved.delete with correct params", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("item_type")).toBe("message")
		expect(params.get("item_id")).toBe("C001")
		expect(params.get("ts")).toBe("111.222")
		expect(mockFetch.mock.calls[0][0]).toContain("saved.delete")
	})

	it("prints success message", async () => {
		mockFetchResponse({ ok: true })
		await run({ "item-id": "C001", ts: "111.222" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Removed from Later"))
	})
})

// ── later update ────────────────────────────────────────────

describe("later update", () => {
	async function run(args: Record<string, unknown>) {
		const { updateCommand } = await import("../src/platforms/slack/later/update.ts")
		await (updateCommand as any).run({ args: { workspace: "test-ws", ...args } })
	}

	it("calls saved.update with date_due when --date-due provided", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222", "date-due": "1774224000" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("item_id")).toBe("C001")
		expect(params.get("ts")).toBe("111.222")
		expect(params.get("date_due")).toBe("1774224000")
		expect(mockFetch.mock.calls[0][0]).toContain("saved.update")
	})

	it("calls saved.update with date_snoozed_until when --snooze provided", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222", snooze: "1774224000" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("date_snoozed_until")).toBe("1774224000")
	})

	it("prints success message", async () => {
		mockFetchResponse({ ok: true })
		await run({ "item-id": "C001", ts: "111.222", "date-due": "tomorrow" })
		expect(console.log).toHaveBeenCalledWith(expect.stringContaining("Updated Later item"))
	})

	it("sends mark and todo_state when --mark completed provided", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222", mark: "completed" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("mark")).toBe("completed")
		expect(params.get("todo_state")).toBe("completed")
	})

	it("sends mark and todo_state when --mark uncompleted provided", async () => {
		mockFetchResponse({ ok: true })

		await run({ "item-id": "C001", ts: "111.222", mark: "uncompleted" })

		const body = mockFetch.mock.calls[0][1].body
		const params = new URLSearchParams(body)
		expect(params.get("mark")).toBe("uncompleted")
		expect(params.get("todo_state")).toBe("uncompleted")
	})
})
