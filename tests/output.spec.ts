import { formatOutput, getOutputFormat } from "../src/lib/output.ts"

describe("formatOutput", () => {
	it("should format array data as JSON", () => {
		const data = [{ name: "general", id: "C123" }]
		const result = formatOutput(data, "json")
		expect(JSON.parse(result)).toStrictEqual(data)
	})

	it("should format object data as JSON", () => {
		const data = { name: "general", id: "C123" }
		const result = formatOutput(data, "json")
		expect(JSON.parse(result)).toStrictEqual(data)
	})

	it("should format array data as plain tab-separated", () => {
		const data = [
			{ name: "general", id: "C123" },
			{ name: "random", id: "C456" },
		]
		const result = formatOutput(data, "plain")
		expect(result).toBe("general\tC123\nrandom\tC456")
	})

	it("should format object data as plain tab-separated", () => {
		const data = { name: "general", id: "C123" }
		const result = formatOutput(data, "plain")
		expect(result).toBe("name\tgeneral\nid\tC123")
	})

	it("should format plain with custom columns", () => {
		const data = [{ name: "general", id: "C123", extra: "ignored" }]
		const columns = [
			{ key: "id", label: "ID" },
			{ key: "name", label: "Name" },
		]
		const result = formatOutput(data, "plain", columns)
		expect(result).toBe("C123\tgeneral")
	})

	it("should format empty array as table with 'No results.'", () => {
		const result = formatOutput([], "table")
		expect(result).toBe("No results.")
	})

	it("should format empty array as empty string for plain", () => {
		const result = formatOutput([], "plain")
		expect(result).toBe("")
	})

	it("should format scalar data as string", () => {
		expect(formatOutput("hello", "plain")).toBe("hello")
		expect(formatOutput("hello", "table")).toBe("hello")
		expect(formatOutput(42, "plain")).toBe("42")
	})

	it("should format table with header and divider", () => {
		const data = [{ name: "general" }]
		const result = formatOutput(data, "table")
		const lines = result.split("\n")
		expect(lines).toHaveLength(3) // header, divider, row
		expect(lines[2]).toContain("general")
	})
})

describe("getOutputFormat", () => {
	it("should return json when --json is set", () => {
		expect(getOutputFormat({ json: true })).toBe("json")
	})

	it("should return plain when --plain is set", () => {
		expect(getOutputFormat({ plain: true })).toBe("plain")
	})

	it("should return table by default", () => {
		expect(getOutputFormat({})).toBe("table")
	})

	it("should prefer json over plain", () => {
		expect(getOutputFormat({ json: true, plain: true })).toBe("json")
	})
})
