import { vi, beforeEach } from "vitest"
import { writeFile } from "node:fs/promises"

const mockFilesInfo = vi.fn()

vi.mock("../src/lib/credentials.ts", () => ({
	getToken: vi.fn().mockResolvedValue({ token: "xoxp-test", workspace: "test-ws" }),
}))

vi.mock("../src/platforms/slack/client.ts", () => ({
	createSlackClient: vi.fn(() => ({
		files: {
			info: (...a: unknown[]) => mockFilesInfo(...a),
		},
	})),
}))

vi.mock("node:fs/promises", () => ({
	writeFile: vi.fn().mockResolvedValue(undefined),
}))

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

beforeEach(() => {
	vi.clearAllMocks()
	vi.spyOn(console, "log").mockImplementation(() => {})
	vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	vi.restoreAllMocks()
})

async function run(args: Record<string, unknown>) {
	const { downloadCommand } = await import("../src/platforms/slack/files/download.ts")
	await (downloadCommand as any).run({ args: { workspace: "test-ws", ...args } })
}

describe("files download", () => {
	it("should download using url_private_download", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: {
				id: "F001",
				name: "report.pdf",
				url_private_download: "https://files.slack.com/download/report.pdf",
				url_private: "https://files.slack.com/view/report.pdf",
			},
		})
		mockFetch.mockResolvedValueOnce({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
		})

		await run({ file: "F001" })

		expect(mockFetch).toHaveBeenCalledWith(
			"https://files.slack.com/download/report.pdf",
			{ headers: { Authorization: "Bearer xoxp-test" } },
		)
		expect(writeFile).toHaveBeenCalledWith(
			expect.stringContaining("report.pdf"),
			expect.any(Buffer),
		)
	})

	it("should fall back to url_private when url_private_download is missing", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: {
				id: "F002",
				name: "snippet.txt",
				url_private: "https://files.slack.com/view/snippet.txt",
			},
		})
		mockFetch.mockResolvedValueOnce({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(256)),
		})

		await run({ file: "F002" })

		expect(mockFetch).toHaveBeenCalledWith(
			"https://files.slack.com/view/snippet.txt",
			expect.objectContaining({ headers: { Authorization: "Bearer xoxp-test" } }),
		)
	})

	it("should use --output path when provided", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: {
				id: "F003",
				name: "doc.pdf",
				url_private_download: "https://files.slack.com/download/doc.pdf",
			},
		})
		mockFetch.mockResolvedValueOnce({
			ok: true,
			arrayBuffer: () => Promise.resolve(new ArrayBuffer(512)),
		})

		await run({ file: "F003", output: "/tmp/custom-name.pdf" })

		expect(writeFile).toHaveBeenCalledWith(
			"/tmp/custom-name.pdf",
			expect.any(Buffer),
		)
	})

	it("should error when file not found", async () => {
		mockFilesInfo.mockResolvedValueOnce({ file: undefined })

		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit")
		})

		await expect(run({ file: "F999" })).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("File not found"),
		)
		mockExit.mockRestore()
	})

	it("should error when no download URL available", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: { id: "F004", name: "external.link" },
		})

		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit")
		})

		await expect(run({ file: "F004" })).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("No download URL"),
		)
		mockExit.mockRestore()
	})

	it("should error on failed HTTP response", async () => {
		mockFilesInfo.mockResolvedValueOnce({
			file: {
				id: "F005",
				name: "forbidden.pdf",
				url_private_download: "https://files.slack.com/download/forbidden.pdf",
			},
		})
		mockFetch.mockResolvedValueOnce({
			ok: false,
			status: 403,
			statusText: "Forbidden",
		})

		const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
			throw new Error("exit")
		})

		await expect(run({ file: "F005" })).rejects.toThrow("exit")
		expect(console.error).toHaveBeenCalledWith(
			expect.stringContaining("Download failed: 403"),
		)
		mockExit.mockRestore()
	})
})
