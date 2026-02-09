import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		include: ["**/*.spec.ts"],
		exclude: ["node_modules", "dist"],
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.ts"],
			exclude: ["**/*.d.ts", "src/index.ts"],
		},
	},
})
