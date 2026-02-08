import { HollaError, AuthError, SlackApiError } from "../src/lib/errors.ts"

describe("HollaError", () => {
	it("should set message and code", () => {
		const err = new HollaError("something broke", "TEST_ERROR")
		expect(err.message).toBe("something broke")
		expect(err.code).toBe("TEST_ERROR")
		expect(err.name).toBe("HollaError")
		expect(err).toBeInstanceOf(Error)
	})
})

describe("AuthError", () => {
	it("should set AUTH_ERROR code", () => {
		const err = new AuthError("not logged in")
		expect(err.message).toBe("not logged in")
		expect(err.code).toBe("AUTH_ERROR")
		expect(err.name).toBe("AuthError")
		expect(err).toBeInstanceOf(HollaError)
	})
})

describe("SlackApiError", () => {
	it("should set SLACK_API_ERROR code and slackError", () => {
		const err = new SlackApiError("api failed", "channel_not_found")
		expect(err.message).toBe("api failed")
		expect(err.code).toBe("SLACK_API_ERROR")
		expect(err.slackError).toBe("channel_not_found")
		expect(err.name).toBe("SlackApiError")
		expect(err).toBeInstanceOf(HollaError)
	})

	it("should work without slackError", () => {
		const err = new SlackApiError("api failed")
		expect(err.slackError).toBeUndefined()
	})
})
