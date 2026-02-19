import { normalizeSlackText, sanitizeCanvasMarkdown } from "../src/platforms/slack/text.ts"

describe("normalizeSlackText", () => {
	it("should fix zsh-escaped <!here>", () => {
		expect(normalizeSlackText("<\\!here>")).toBe("<!here>")
	})

	it("should fix zsh-escaped <!channel>", () => {
		expect(normalizeSlackText("<\\!channel>")).toBe("<!channel>")
	})

	it("should fix zsh-escaped <!everyone>", () => {
		expect(normalizeSlackText("<\\!everyone>")).toBe("<!everyone>")
	})

	it("should handle multiple escaped mentions (regex /g)", () => {
		expect(normalizeSlackText("Hey <\\!here> and <\\!channel>")).toBe(
			"Hey <!here> and <!channel>",
		)
	})

	it("should not alter already-correct mentions", () => {
		expect(normalizeSlackText("<!here>")).toBe("<!here>")
	})

	it("should not alter unrelated backslashes", () => {
		expect(normalizeSlackText("path\\to\\file")).toBe("path\\to\\file")
	})

	it("should return empty string unchanged", () => {
		expect(normalizeSlackText("")).toBe("")
	})

	it("should not alter plain text", () => {
		expect(normalizeSlackText("just a normal message")).toBe("just a normal message")
	})
})

describe("sanitizeCanvasMarkdown", () => {
	it("should convert bullet sub-items under numbered lists to numbered sub-items", () => {
		const input = "1. Item one:\n   - Sub A\n   - Sub B"
		const result = sanitizeCanvasMarkdown(input)
		expect(result.markdown).toBe("1. Item one:\n   1. Sub A\n   2. Sub B")
		expect(result.modified).toBe(true)
	})

	it("should leave bullet-only nested lists unchanged", () => {
		const input = "- Item one:\n  - Sub A\n  - Sub B"
		const result = sanitizeCanvasMarkdown(input)
		expect(result.markdown).toBe(input)
		expect(result.modified).toBe(false)
	})

	it("should leave numbered-only nested lists unchanged", () => {
		const input = "1. Item one\n   1. Sub A\n   2. Sub B"
		const result = sanitizeCanvasMarkdown(input)
		expect(result.markdown).toBe(input)
		expect(result.modified).toBe(false)
	})

	it("should reset sub-counter for each new numbered parent", () => {
		const input = "1. First:\n   - A\n   - B\n2. Second:\n   - C\n   - D"
		const result = sanitizeCanvasMarkdown(input)
		expect(result.markdown).toBe("1. First:\n   1. A\n   2. B\n2. Second:\n   1. C\n   2. D")
		expect(result.modified).toBe(true)
	})

	it("should stop converting after a non-list line", () => {
		const input = "1. Item\n   - Sub\n\nSome text\n   - Not a sub-item"
		const result = sanitizeCanvasMarkdown(input)
		expect(result.markdown).toBe("1. Item\n   1. Sub\n\nSome text\n   - Not a sub-item")
		expect(result.modified).toBe(true)
	})

	it("should return plain text unchanged", () => {
		const result = sanitizeCanvasMarkdown("Hello world")
		expect(result.markdown).toBe("Hello world")
		expect(result.modified).toBe(false)
	})

	it("should return empty string unchanged", () => {
		const result = sanitizeCanvasMarkdown("")
		expect(result.markdown).toBe("")
		expect(result.modified).toBe(false)
	})
})
