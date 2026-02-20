import { vi, beforeEach, afterEach } from "vitest"

const { mockReadConfig } = vi.hoisted(() => ({
	mockReadConfig: vi.fn().mockResolvedValue({}),
}))

vi.mock("../src/lib/config.ts", () => ({
	readConfig: mockReadConfig,
}))

import { detectAgent, applySuffix, getAttributionConfig } from "../src/lib/attribution.ts"

beforeEach(() => {
	vi.clearAllMocks()
})

afterEach(() => {
	vi.restoreAllMocks()
})

describe("detectAgent", () => {
	const originalEnv = process.env

	beforeEach(() => {
		process.env = { ...originalEnv }
		delete process.env.CLAUDECODE
		// Remove all CURSOR_ env vars
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("CURSOR_")) delete process.env[key]
		}
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it("should return override when provided", () => {
		expect(detectAgent("my-bot")).toBe("my-bot")
	})

	it("should detect claude from CLAUDECODE env", () => {
		process.env.CLAUDECODE = "1"
		expect(detectAgent()).toBe("claude")
	})

	it("should detect cursor from CURSOR_ env vars", () => {
		process.env.CURSOR_TRACE_ID = "abc"
		expect(detectAgent()).toBe("cursor")
	})

	it("should prioritize override over env vars", () => {
		process.env.CLAUDECODE = "1"
		expect(detectAgent("custom")).toBe("custom")
	})

	it("should prioritize CLAUDECODE over CURSOR_", () => {
		process.env.CLAUDECODE = "1"
		process.env.CURSOR_TRACE_ID = "abc"
		expect(detectAgent()).toBe("claude")
	})

	it("should fallback to holla when no signals", () => {
		expect(detectAgent()).toBe("holla")
	})
})

describe("applySuffix", () => {
	it("should append suffix with agent name", () => {
		const result = applySuffix("hello", "claude", "_sent via {agent}_")
		expect(result).toBe("hello\n_sent via claude_")
	})

	it("should replace multiple {agent} placeholders", () => {
		const result = applySuffix("hello", "bot", "{agent} ({agent})")
		expect(result).toBe("hello\nbot (bot)")
	})

	it("should handle suffix without placeholder", () => {
		const result = applySuffix("hello", "claude", "_sent via holla_")
		expect(result).toBe("hello\n_sent via holla_")
	})
})

describe("getAttributionConfig", () => {
	const originalEnv = process.env

	beforeEach(() => {
		process.env = { ...originalEnv }
		delete process.env.CLAUDECODE
		for (const key of Object.keys(process.env)) {
			if (key.startsWith("CURSOR_")) delete process.env[key]
		}
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it("should return defaults (reaction on, suffix off)", async () => {
		const result = await getAttributionConfig({})
		expect(result.reaction).toBe("robot_face")
		expect(result.suffix).toBe(false)
	})

	it("should respect config reaction", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { reaction: "zap" } },
		})
		const result = await getAttributionConfig({})
		expect(result.reaction).toBe("zap")
	})

	it("should respect config suffix", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { suffix: "_sent via {agent}_" } },
		})
		const result = await getAttributionConfig({})
		expect(result.suffix).toBe("_sent via {agent}_")
	})

	it("should respect config disabling reaction", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { reaction: false } },
		})
		const result = await getAttributionConfig({})
		expect(result.reaction).toBe(false)
	})

	it("should disable both with --no-attribution", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { reaction: "robot_face", suffix: "_sent via {agent}_" } },
		})
		const result = await getAttributionConfig({ attribution: false })
		expect(result.reaction).toBe(false)
		expect(result.suffix).toBe(false)
	})

	it("should disable only reaction with --no-reaction", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { reaction: "robot_face", suffix: "_sent via {agent}_" } },
		})
		const result = await getAttributionConfig({ reaction: false })
		expect(result.reaction).toBe(false)
		expect(result.suffix).toBe("_sent via {agent}_")
	})

	it("should disable only suffix with --no-suffix", async () => {
		mockReadConfig.mockResolvedValueOnce({
			slack: { attribution: { reaction: "robot_face", suffix: "_sent via {agent}_" } },
		})
		const result = await getAttributionConfig({ suffix: false })
		expect(result.reaction).toBe("robot_face")
		expect(result.suffix).toBe(false)
	})

	it("should detect agent name", async () => {
		const result = await getAttributionConfig({})
		expect(result.agent).toBe("holla")
	})

	it("should use --agent override", async () => {
		const result = await getAttributionConfig({ agent: "my-bot" })
		expect(result.agent).toBe("my-bot")
	})
})
