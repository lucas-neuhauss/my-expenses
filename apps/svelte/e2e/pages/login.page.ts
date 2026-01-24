import { expect, type Page } from "@playwright/test";

export class LoginPage {
	constructor(private page: Page) {}

	// Locators
	get emailInput() {
		return this.page.getByLabel("Email");
	}

	get passwordInput() {
		return this.page.getByLabel("Password");
	}

	get loginButton() {
		return this.page.getByRole("button", { name: "Login" });
	}

	get errorMessage() {
		return this.page.locator("p.text-red-400");
	}

	get signUpLink() {
		return this.page.getByRole("link", { name: "Sign up" });
	}

	// Actions
	async goto() {
		await this.page.goto("/login");
	}

	async login(email: string, password: string) {
		await this.emailInput.fill(email);
		await this.passwordInput.fill(password);
		await this.loginButton.click();
	}

	async loginAsTestUser() {
		await this.login("test@email.com", "password");
	}

	// Assertions
	async expectError(message: string) {
		await expect(this.errorMessage).toContainText(message);
	}

	async expectLoggedIn() {
		await expect(this.page).toHaveURL("/");
		await expect(
			this.page.getByRole("button", { name: "Create Transaction" }),
		).toBeVisible();
	}
}
