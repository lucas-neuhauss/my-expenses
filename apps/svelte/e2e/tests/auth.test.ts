import { expect, test } from "@playwright/test";
import { LoginPage } from "../pages";

test.describe("Authentication", () => {
	test("should display login form", async ({ page }) => {
		const loginPage = new LoginPage(page);
		await loginPage.goto();

		await expect(loginPage.emailInput).toBeVisible();
		await expect(loginPage.passwordInput).toBeVisible();
		await expect(loginPage.loginButton).toBeVisible();
	});

	test("should login with valid credentials", async ({ page }) => {
		const loginPage = new LoginPage(page);
		await loginPage.goto();

		await loginPage.loginAsTestUser();
		await loginPage.expectLoggedIn();
	});

	test("should show error with invalid credentials", async ({ page }) => {
		const loginPage = new LoginPage(page);
		await loginPage.goto();

		await loginPage.login("wrong@email.com", "wrongpassword");

		// Should stay on login page
		await expect(page).toHaveURL(/\/login/);
	});

	test("should redirect unauthenticated users to login", async ({ page }) => {
		// Clear any stored auth state by using a fresh context
		await page.goto("/");

		// Should redirect to login
		await expect(page).toHaveURL(/\/login/);
	});

	test("should navigate to register page", async ({ page }) => {
		const loginPage = new LoginPage(page);
		await loginPage.goto();

		await loginPage.signUpLink.click();
		await expect(page).toHaveURL(/\/register/);
	});
});
