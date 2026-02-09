import manifest from "../slack-app-manifest.json"

const userScopes = manifest.oauth_config.scopes.user
const botScopes = manifest.oauth_config.scopes.bot

describe("slack-app-manifest.json scopes", () => {
	it("should have bot scope for channel reading", () => {
		expect(botScopes).toContain("channels:read")
	})

	it("should have user scopes for channels", () => {
		for (const s of ["channels:read", "channels:write", "channels:history"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for chat", () => {
		expect(userScopes).toContain("chat:write")
	})

	it("should have user scopes for files", () => {
		for (const s of ["files:read", "files:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for bookmarks", () => {
		for (const s of ["bookmarks:read", "bookmarks:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scope for emoji", () => {
		expect(userScopes).toContain("emoji:read")
	})

	it("should have user scopes for usergroups", () => {
		for (const s of ["usergroups:read", "usergroups:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scope for users:read.email", () => {
		expect(userScopes).toContain("users:read.email")
	})

	it("should have user scopes for DND", () => {
		for (const s of ["dnd:read", "dnd:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for reactions", () => {
		for (const s of ["reactions:read", "reactions:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for pins", () => {
		for (const s of ["pins:read", "pins:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for stars", () => {
		for (const s of ["stars:read", "stars:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for reminders", () => {
		for (const s of ["reminders:read", "reminders:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scope for search", () => {
		expect(userScopes).toContain("search:read")
	})

	it("should have user scope for team info", () => {
		expect(userScopes).toContain("team:read")
	})

	it("should have user scopes for user profiles", () => {
		for (const s of ["users:read", "users.profile:read", "users.profile:write"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for groups (private channels)", () => {
		for (const s of ["groups:read", "groups:write", "groups:history"]) {
			expect(userScopes).toContain(s)
		}
	})

	it("should have user scopes for DMs and group DMs", () => {
		for (const s of ["im:read", "im:write", "im:history", "mpim:read", "mpim:write", "mpim:history"]) {
			expect(userScopes).toContain(s)
		}
	})
})
