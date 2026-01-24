import { defineConfig, devices } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

export default defineConfig({
	webServer: {
		command: "npm run build && npm run preview",
		port: 4173,
		reuseExistingServer: !process.env.CI,
		env: {
			E2E_TEST: "true",
		},
	},

	testDir: "e2e",
	outputDir: "e2e/.results",

	/* Run tests sequentially to prevent server overload */
	workers: 1,

	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,

	/* Reporter to use */
	reporter: [["html", { outputFolder: "e2e/.report" }], ["list"]],

	/* Shared settings for all the projects below */
	use: {
		baseURL: "http://localhost:4173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},

	projects: [
		/* Setup project - runs first to authenticate */
		{
			name: "setup",
			testMatch: /global-setup\.ts/,
		},

		/* Main test projects - depend on setup */
		{
			name: "chromium",
			use: {
				...devices["Desktop Chrome"],
				storageState: authFile,
			},
			dependencies: ["setup"],
			testIgnore: /auth\.test\.ts/,
		},

		/* Unauthenticated tests (login, register) */
		{
			name: "unauthenticated",
			testMatch: /auth\.test\.ts/,
			use: {
				...devices["Desktop Chrome"],
			},
		},
	],
});
