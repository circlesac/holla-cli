import { join } from "node:path"
import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { vi, beforeEach, afterEach } from "vitest"

let tempDir: string

beforeEach(async () => {
	vi.resetModules()
	tempDir = await mkdtemp(join(tmpdir(), "holla-cache-test-"))
	vi.stubEnv("HOME", tempDir)
})

afterEach(async () => {
	vi.unstubAllEnvs()
	await rm(tempDir, { recursive: true, force: true })
})

describe("revalidateList", () => {
	it("calls the fetcher when cache is empty and persists the result", async () => {
		const { revalidateList, loadListCache } = await import("../src/lib/cache.ts")
		const fetcher = vi.fn().mockResolvedValue([{ id: "A", name: "alpha" }])

		const data = await revalidateList("ws", "channels", fetcher)
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(data).toEqual([{ id: "A", name: "alpha" }])

		const cached = await loadListCache("ws", "channels")
		expect(cached?.data).toEqual([{ id: "A", name: "alpha" }])
		expect(typeof cached?.updatedAt).toBe("number")
	})

	it("returns cached data without calling the fetcher within TTL", async () => {
		const { revalidateList } = await import("../src/lib/cache.ts")
		const fetcher = vi.fn().mockResolvedValue([{ id: "A" }])
		await revalidateList("ws", "channels", fetcher)

		const refetched = vi.fn().mockResolvedValue([{ id: "WRONG" }])
		const data = await revalidateList("ws", "channels", refetched)
		expect(refetched).not.toHaveBeenCalled()
		expect(data).toEqual([{ id: "A" }])
	})

	it("bypasses the cache when bypass: true", async () => {
		const { revalidateList } = await import("../src/lib/cache.ts")
		await revalidateList("ws", "channels", () => Promise.resolve([{ id: "old" }]))

		const fetcher = vi.fn().mockResolvedValue([{ id: "new" }])
		const data = await revalidateList("ws", "channels", fetcher, { bypass: true })
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(data).toEqual([{ id: "new" }])
	})

	it("refetches when the cache is older than ttlMs", async () => {
		const { revalidateList, saveListCache } = await import("../src/lib/cache.ts")
		await saveListCache("ws", "channels", [{ id: "stale" }])
		// Backdate the cache by writing manually with old updatedAt
		const { writeFile } = await import("node:fs/promises")
		const { join: pjoin } = await import("node:path")
		await writeFile(
			pjoin(tempDir, ".config", "holla", "cache", "ws-channels.json"),
			JSON.stringify({ updatedAt: Date.now() - 10_000, data: [{ id: "stale" }] }),
		)

		const fetcher = vi.fn().mockResolvedValue([{ id: "fresh" }])
		const data = await revalidateList("ws", "channels", fetcher, { ttlMs: 1_000 })
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(data).toEqual([{ id: "fresh" }])
	})

	it("ignores legacy { data, expiresAt } cache format", async () => {
		const { revalidateList } = await import("../src/lib/cache.ts")
		const { writeFile, mkdir } = await import("node:fs/promises")
		const { join: pjoin } = await import("node:path")
		const dir = pjoin(tempDir, ".config", "holla", "cache")
		await mkdir(dir, { recursive: true })
		// Pre-existing v1 cache shape (the resolve.ts pre-#24 format)
		await writeFile(
			pjoin(dir, "ws-channels.json"),
			JSON.stringify({ data: { general: "C001" }, expiresAt: Date.now() + 999_999 }),
		)

		const fetcher = vi.fn().mockResolvedValue([{ id: "fresh" }])
		const data = await revalidateList("ws", "channels", fetcher)
		expect(fetcher).toHaveBeenCalledTimes(1)
		expect(data).toEqual([{ id: "fresh" }])
	})
})

describe("history cache", () => {
	it("round-trips messages and newestTs", async () => {
		const { saveHistoryCache, loadHistoryCache } = await import(
			"../src/lib/cache.ts"
		)
		const messages = [
			{ ts: "200.0", text: "b" },
			{ ts: "100.0", text: "a" },
		]
		await saveHistoryCache("ws", "C001", messages, "200.0")
		const entry = await loadHistoryCache("ws", "C001")
		expect(entry?.messages).toEqual(messages)
		expect(entry?.newestTs).toBe("200.0")
	})

	it("returns null when cache is missing or shape is wrong", async () => {
		const { loadHistoryCache } = await import("../src/lib/cache.ts")
		expect(await loadHistoryCache("ws", "missing")).toBeNull()
	})

	it("pickNewestTs picks the largest ts numerically", async () => {
		const { pickNewestTs } = await import("../src/lib/cache.ts")
		const msgs = [
			{ ts: "1700000000.000001" },
			{ ts: "1700000005.123456" },
			{ ts: "1700000001.999999" },
		]
		expect(pickNewestTs(msgs)).toBe("1700000005.123456")
		expect(pickNewestTs([], "fallback")).toBe("fallback")
	})
})

describe("shouldBypassCache", () => {
	it("is true when --no-cache is set", async () => {
		const { shouldBypassCache } = await import("../src/lib/cache.ts")
		expect(shouldBypassCache({ "no-cache": true })).toBe(true)
		expect(shouldBypassCache({ "no-cache": false })).toBe(false)
		expect(shouldBypassCache({})).toBe(false)
	})
})
