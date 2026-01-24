import { expect, type Page } from "@playwright/test";

export class DashboardPage {
	constructor(private page: Page) {}

	// Locators
	get createTransactionButton() {
		return this.page.getByRole("button", { name: "Create Transaction" });
	}

	get walletSelect() {
		return this.page.getByTitle("Select wallet");
	}

	get categoryCombobox() {
		return this.page.locator("[data-categories-combobox]");
	}

	get statusSelect() {
		return this.page.getByRole("button", { name: "All Status" });
	}

	get prevMonthButton() {
		return this.page.getByRole("button", { name: "Go to the previous month" });
	}

	get nextMonthButton() {
		return this.page.getByRole("button", { name: "Go to the next month" });
	}

	get transactionTable() {
		return this.page.getByRole("table");
	}

	get balanceCard() {
		return this.page
			.locator('[data-slot="card"]')
			.filter({ hasText: "Month-end balance" });
	}

	get incomeCard() {
		return this.page.locator('[data-slot="card"]').filter({ hasText: "Month Income" });
	}

	get expenseCard() {
		return this.page.locator('[data-slot="card"]').filter({ hasText: "Month Expense" });
	}

	get emptyState() {
		return this.page.getByText("You don't have transactions");
	}

	// Actions
	async goto() {
		await this.page.goto("/");
	}

	async openCreateTransaction() {
		await this.createTransactionButton.click();
	}

	async filterByWallet(walletName: string) {
		await this.walletSelect.click();
		await this.page.getByRole("option", { name: walletName }).click();
	}

	async filterByStatus(status: "All" | "Paid" | "Not Paid") {
		await this.statusSelect.click();
		await this.page.getByRole("option", { name: status }).click();
	}

	async goToPreviousMonth() {
		await this.prevMonthButton.click();
	}

	async goToNextMonth() {
		await this.nextMonthButton.click();
	}

	async selectMonth(month: string) {
		// Find the month selector (between navigation buttons)
		const monthTrigger = this.page.locator('button[data-select-trigger][name="month"]');
		if (await monthTrigger.isVisible()) {
			await monthTrigger.click();
			await this.page.getByRole("option", { name: month }).click();
		}
	}

	async selectYear(year: string) {
		const yearTrigger = this.page.locator('button[data-select-trigger][name="year"]');
		if (await yearTrigger.isVisible()) {
			await yearTrigger.click();
			await this.page.getByRole("option", { name: year }).click();
		}
	}

	async editTransaction(description: string) {
		const row = this.page.getByRole("row").filter({ hasText: description });
		await row.getByRole("button", { name: "Edit transaction" }).click();
	}

	async deleteTransaction(description: string) {
		const row = this.page.getByRole("row").filter({ hasText: description });
		await row.getByRole("button", { name: "Delete transaction" }).click();
	}

	// Assertions
	async expectLoaded() {
		await expect(this.createTransactionButton).toBeVisible();
	}

	async expectTransactionVisible(description: string) {
		await expect(this.page.getByRole("cell", { name: description })).toBeVisible();
	}

	async expectTransactionNotVisible(description: string) {
		await expect(this.page.getByRole("cell", { name: description })).not.toBeVisible();
	}

	async expectEmptyState() {
		await expect(this.emptyState).toBeVisible();
	}
}
