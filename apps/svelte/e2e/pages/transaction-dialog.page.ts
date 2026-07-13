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

	// bits-ui's Select renders `name` on a hidden sibling <input>, not on the
	// trigger button. Scope to the label that precedes the trigger instead.
	// All selects are scoped to the visible tabpanel because the dialog keeps
	// all three tabpanels in the DOM (hidden ones still contain form markup).

	get walletSelect() {
		return this.visibleTabpanel
			.locator('div:has(> label:has-text("Wallet"))')
			.locator("button[data-select-trigger]");
	}

	/** For transference: source wallet select. */
	get fromWalletSelect() {
		return this.visibleTabpanel
			.locator('div:has(> label:has-text("From Wallet"))')
			.locator("button[data-select-trigger]");
	}

	/** For transference: destination wallet select. */
	get toWalletSelect() {
		return this.visibleTabpanel
			.locator('div:has(> label:has-text("To Wallet"))')
			.locator("button[data-select-trigger]");
	}

	private get visibleTabpanel() {
		return this.dialog.locator('[role="tabpanel"]:not([hidden])');
	}

	get categoryCombobox() {
		return this.dialog.getByRole("combobox", { name: "Select category" });
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

	// Installment locators
	get installmentsSwitch() {
		return this.dialog.getByRole("switch", { name: "Enable installments" });
	}

	get installmentsCountInput() {
		return this.dialog.locator("#installments-count");
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

	async selectFromWallet(walletName: string) {
		await this.fromWalletSelect.click();
		await this.page.getByRole("option", { name: walletName }).click();
	}

	async selectToWallet(walletName: string) {
		await this.toWalletSelect.click();
		await this.page.getByRole("option", { name: walletName }).click();
	}

	async selectCategory(categoryName: string) {
		await this.categoryCombobox.click();
		// Wait for popover to open
		await this.page.waitForTimeout(100);
		await this.page.getByRole("option").filter({ hasText: categoryName }).click();
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

	/** Create an expense transaction with installments enabled. */
	async createExpenseWithInstallments(data: {
		wallet?: string;
		category?: string;
		description: string;
		value: number;
		installmentsCount: number;
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

		// Enable installments
		const isInstallmentsChecked =
			await this.installmentsSwitch.getAttribute("data-state");
		if (isInstallmentsChecked !== "checked") {
			await this.installmentsSwitch.click();
		}

		// Set installment count
		await this.installmentsCountInput.fill(String(data.installmentsCount));

		if (data.paid === false) {
			const isChecked = await this.paidSwitch.getAttribute("data-state");
			if (isChecked === "checked") {
				await this.togglePaid();
			}
		}

		await this.save();
	}

	/** Create a transference between two wallets. */
	async createTransference(data: {
		fromWallet: string;
		toWallet: string;
		description: string;
		value: number;
		paid?: boolean;
	}) {
		await this.selectTab("Transference");

		await this.selectFromWallet(data.fromWallet);
		await this.selectToWallet(data.toWallet);

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
