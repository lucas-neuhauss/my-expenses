import { expect, test as setup } from "@playwright/test";

const authFile = "e2e/.auth/user.json";

setup("authenticate", async ({ page }) => {
	// Navigate to login page
	await page.goto("/login");

	// Fill in test credentials
	await page.getByLabel("Email").fill("test@email.com");
	await page.getByLabel("Password").fill("password");

	// Submit the form
	await page.getByRole("button", { name: "Login" }).click();

	// Wait for navigation to dashboard
	await expect(page).toHaveURL("/");
	await expect(page.getByRole("button", { name: "Create Transaction" })).toBeVisible();

	// Cleanup any existing test data before running tests
	const response = await page.request.delete("/api/test/seed", {
		data: { all: true },
	});
	if (!response.ok()) {
		console.warn(
			`Warning: Test data cleanup failed with status ${response.status()}. This may be OK if there's no data to clean up.`,
		);
	}

	// Save signed-in state to file
	await page.context().storageState({ path: authFile });
});
