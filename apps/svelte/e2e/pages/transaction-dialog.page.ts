import { expect, type Page } from "@playwright/test";

export class TransactionDialog {
	constructor(private page: Page) {}

	// Locators
	get dialog() {
		return this.page.getByRole("dialog");
	}

	get expenseTab() {
		return this.dialog.getByRole("tab", { name: "Expense" });
	}

	get incomeTab() {
		return this.dialog.getByRole("tab", { name: "Income" });
	}

	get transferenceTab() {
		return this.dialog.getByRole("tab", { name: "Transference" });
	}

	get walletSelect() {
		return this.dialog.locator('[data-select-trigger][name="wallet"]');
	}

	get categoryCombobox() {
		return this.dialog.locator("[data-categories-combobox]");
	}

	get descriptionInput() {
		// Description textbox - find by role within the visible tabpanel
		// The accessible name varies between tabs due to duplicate IDs
		return this.dialog.locator('[role="tabpanel"]:not([hidden])').getByRole("textbox");
	}

	get valueInput() {
		// Value spinbutton - find within visible tabpanel
		return this.dialog.locator('[role="tabpanel"]:not([hidden])').getByRole("spinbutton");
	}

	get paidSwitch() {
		return this.dialog.getByRole("switch", { name: "Paid" });
	}

	get saveButton() {
		return this.dialog.getByRole("button", { name: "Save", exact: true });
	}

	get saveAndCreateAnotherButton() {
		return this.dialog.getByRole("button", { name: "Save and Create Another" });
	}

	get closeButton() {
		return this.dialog.getByRole("button", { name: "Close" });
	}

	// Actions
	async selectTab(tab: "Expense" | "Income" | "Transference") {
		const tabButton = this.dialog.getByRole("tab", { name: tab });
		await tabButton.click();
	}

	async selectWallet(walletName: string) {
		await this.walletSelect.click();
		await this.page.getByRole("option", { name: walletName }).click();
	}

	async selectCategory(categoryName: string) {
		await this.categoryCombobox.click();
		// Wait for popover to open
		await this.page.waitForTimeout(100);
		await this.page
			.locator("[data-categories-combobox-content]")
			.getByText(categoryName, { exact: true })
			.click();
	}

	async fillDescription(description: string) {
		await this.descriptionInput.fill(description);
	}

	async fillValue(value: number) {
		await this.valueInput.fill(String(value));
	}

	async togglePaid() {
		await this.paidSwitch.click();
	}

	async save() {
		await this.saveButton.click();
	}

	async saveAndCreateAnother() {
		await this.saveAndCreateAnotherButton.click();
	}

	async createExpense(data: {
		wallet?: string;
		category?: string;
		description: string;
		value: number;
		paid?: boolean;
	}) {
		await this.selectTab("Expense");

		if (data.wallet) {
			await this.selectWallet(data.wallet);
		}
		if (data.category) {
			await this.selectCategory(data.category);
		}

		await this.fillDescription(data.description);
		await this.fillValue(data.value);

		if (data.paid === false) {
			// If switch is on and we want it off
			const isChecked = await this.paidSwitch.getAttribute("data-state");
			if (isChecked === "checked") {
				await this.togglePaid();
			}
		}

		await this.save();
	}

	async createIncome(data: {
		wallet?: string;
		category?: string;
		description: string;
		value: number;
		paid?: boolean;
	}) {
		await this.selectTab("Income");

		if (data.wallet) {
			await this.selectWallet(data.wallet);
		}
		if (data.category) {
			await this.selectCategory(data.category);
		}

		await this.fillDescription(data.description);
		await this.fillValue(data.value);

		if (data.paid === false) {
			const isChecked = await this.paidSwitch.getAttribute("data-state");
			if (isChecked === "checked") {
				await this.togglePaid();
			}
		}

		await this.save();
	}

	// Assertions
	async expectOpen() {
		await expect(this.dialog).toBeVisible();
	}

	async expectClosed() {
		await expect(this.dialog).not.toBeVisible();
	}
}
