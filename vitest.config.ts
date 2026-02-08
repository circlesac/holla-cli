import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		include: ["**/*.spec.ts"],
		exclude: ["node_modules", "dist"],
		globals: true,
	},
})
