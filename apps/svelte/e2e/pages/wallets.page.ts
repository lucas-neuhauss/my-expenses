import { expect, type Page } from "@playwright/test";

export class WalletsPage {
	constructor(private page: Page) {}

	// Locators
	get createWalletButton() {
		return this.page.getByRole("button", { name: "Create Wallet" });
	}

	walletCard(name: string) {
		return this.page.locator('[data-slot="card"]').filter({ hasText: name });
	}

	// Dialog locators
	get dialog() {
		return this.page.getByRole("dialog");
	}

	get walletNameInput() {
		return this.dialog.getByRole("textbox", { name: "Name" });
	}

	get initialBalanceInput() {
		return this.dialog.getByRole("spinbutton");
	}

	get saveButton() {
		return this.dialog.getByRole("button", { name: /Save|Create/ });
	}

	get confirmDeleteButton() {
		return this.page.getByRole("button", { name: "Continue" });
	}

	// Actions
	async goto() {
		await this.page.goto("/wallets");
	}

	async openCreateDialog() {
		await this.createWalletButton.click();
		await expect(this.dialog).toBeVisible();
	}

	async createWallet(name: string, initialBalance?: number) {
		await this.openCreateDialog();
		await this.walletNameInput.fill(name);
		if (initialBalance !== undefined) {
			await this.initialBalanceInput.fill(String(initialBalance));
		}
		await this.saveButton.click();
	}

	async editWallet(currentName: string, newName: string, newBalance?: number) {
		const card = this.walletCard(currentName);
		await card.getByRole("button", { name: "Edit wallet" }).click();
		await expect(this.dialog).toBeVisible();

		await this.walletNameInput.fill(newName);
		if (newBalance !== undefined) {
			await this.initialBalanceInput.fill(String(newBalance));
		}
		await this.saveButton.click();
	}

	async deleteWallet(name: string) {
		const card = this.walletCard(name);
		await card.getByRole("button", { name: "Delete wallet" }).click();
		await this.confirmDeleteButton.click();
	}

	// Assertions
	async expectLoaded() {
		await expect(this.createWalletButton).toBeVisible();
	}

	async expectWalletVisible(name: string) {
		await expect(this.walletCard(name)).toBeVisible();
	}

	async expectWalletNotVisible(name: string) {
		await expect(this.walletCard(name)).not.toBeVisible();
	}

	async expectWalletBalance(name: string, balance: string) {
		const card = this.walletCard(name);
		await expect(card).toContainText(balance);
	}
}
