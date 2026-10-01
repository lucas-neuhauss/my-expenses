import { enhancedImages } from "@sveltejs/enhanced-img";
import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
	// Build-time opt-in only: runtime environment variables cannot enable test mutations.
	define: { __E2E_TEST_API_ENABLED__: JSON.stringify(process.env.E2E_TEST === "true") },
	plugins: [
		tailwindcss(),
		enhancedImages(),
		sveltekit(),
		visualizer({ emitFile: true, filename: "stats.html" }),
	],

	server: {
		fs: {
			strict: false,
		},
	},

	test: {
		include: ["src/**/*.{test,spec}.{js,ts}"],
		exclude: [...configDefaults.exclude, "src/**/*.integration.test.ts"],
	},
});
