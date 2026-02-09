import { normalizeSlackText } from "../src/platforms/slack/text.ts"

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
