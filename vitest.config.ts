import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		include: ["src/**/*.test.ts"],
		testTimeout: 60_000,
	},
});
