import { configDefaults, defineConfig } from "vitest/config";
import config from "./vite.config";

if (!process.env.TEST_DATABASE_URL) {
	throw new Error(
		"Set TEST_DATABASE_URL to a dedicated test database; never use your app database.",
	);
}

export default defineConfig({
	...config,
	test: {
		include: ["src/**/*.integration.test.ts"],
		exclude: configDefaults.exclude,
		setupFiles: ["src/lib/test-utils/integration-setup.ts"],
		fileParallelism: false,
		testTimeout: 15000,
	},
});
