import { expect, type Page } from "@playwright/test";

export class SearchPage {
	constructor(private page: Page) {}

	// --- Locators ---

	get searchInput() {
		return this.page.getByPlaceholder("Search by description...");
	}

	get startDateInput() {
		return this.page.getByTitle("Start date");
	}

	get endDateInput() {
		return this.page.getByTitle("End date");
	}

	get categoryCombobox() {
		return this.page.getByTitle("Select categories");
	}

	get walletSelect() {
		return this.page.getByTitle("Select wallet");
	}

	get statusSelect() {
		return this.page.getByTitle("Select paid status");
	}

	get transactionTable() {
		return this.page.getByRole("table");
	}

	get tableRows() {
		return this.transactionTable.locator("tbody tr");
	}

	get incomeCard() {
		return this.page
			.locator('[data-slot="card"]')
			.filter({ hasText: "Total Income" });
	}

	get expenseCard() {
		return this.page
			.locator('[data-slot="card"]')
			.filter({ hasText: "Total Expense" });
	}

	get netBalanceCard() {
		return this.page
			.locator('[data-slot="card"]')
			.filter({ hasText: "Net Balance" });
	}

	get prevPageButton() {
		return this.page.getByRole("button", { name: "Previous" });
	}

	get nextPageButton() {
		return this.page.getByRole("button", { name: "Next" });
	}

	get pageIndicator() {
		return this.page.getByText(/Page \d+ of \d+/);
	}

	get showingIndicator() {
		return this.page.getByText(/Showing \d+–\d+ of \d+/);
	}

	get emptyState() {
		return this.page.getByText("No transactions found");
	}

	get noTransactionsState() {
		return this.page.getByText("You don't have any transactions yet");
	}

	// --- Actions ---

	async goto() {
		await this.page.goto("/transactions");
	}

	async search(term: string) {
		await this.searchInput.fill(term);
		// Wait for debounce (300ms) + render + network
		await this.page.waitForTimeout(600);
	}

	async clearSearch() {
		await this.searchInput.clear();
		await this.page.waitForTimeout(600);
	}

	async setDateRange(from: string, to: string) {
		await this.startDateInput.fill(from);
		await this.endDateInput.fill(to);
		await this.page.waitForTimeout(400);
	}

	async clearDateRange() {
		await this.startDateInput.clear();
		await this.endDateInput.clear();
		await this.page.waitForTimeout(400);
	}

	async filterByWallet(walletName: string) {
		await this.walletSelect.click();
		await this.page.getByRole("option", { name: walletName }).click();
	}

	async filterByStatus(status: "All" | "Paid" | "Not Paid") {
		await this.statusSelect.click();
		const valueMap = { All: "all", Paid: "paid", "Not Paid": "not-paid" };
		await this.page
			.locator(`[data-select-item][data-value="${valueMap[status]}"]`)
			.click();
	}

	async openCategoryFilter() {
		await this.categoryCombobox.click();
	}

	async selectCategory(categoryName: string) {
		await this.categoryCombobox.click();
		await this.page.getByRole("option", { name: categoryName }).click();
		// Close the popover by clicking elsewhere
		await this.page.locator("h1").click();
		await this.page.waitForTimeout(200);
	}

	async sortByColumn(columnName: string) {
		await this.page
			.getByRole("columnheader")
			.filter({ hasText: columnName })
			.click();
		await this.page.waitForTimeout(200);
	}

	async goToNextPage() {
		await this.nextPageButton.click();
		await this.page.waitForTimeout(200);
	}

	async goToPreviousPage() {
		await this.prevPageButton.click();
		await this.page.waitForTimeout(200);
	}

	// --- Assertions ---

	async expectLoaded() {
		await expect(this.searchInput).toBeVisible();
		await expect(this.page.getByText("Search Transactions")).toBeVisible();
	}

	async waitForData() {
		// Wait for the table to have at least one row (data loaded)
		await expect(this.tableRows.first()).toBeVisible({ timeout: 10000 });
	}

	async expectTransactionVisible(description: string) {
		await expect(
			this.transactionTable.getByRole("cell", { name: description }),
		).toBeVisible({ timeout: 5000 });
	}

	async expectTransactionNotVisible(description: string) {
		await expect(
			this.transactionTable.getByRole("cell", { name: description }),
		).not.toBeVisible({ timeout: 5000 });
	}

	async expectTransactionCount(count: number) {
		await expect(this.tableRows).toHaveCount(count);
	}

	async expectIncomeCardVisible() {
		await expect(this.incomeCard).toBeVisible();
	}

	async expectExpenseCardVisible() {
		await expect(this.expenseCard).toBeVisible();
	}

	async expectNetBalanceCardVisible() {
		await expect(this.netBalanceCard).toBeVisible();
	}

	async expectEmptyState() {
		await expect(this.emptyState).toBeVisible();
	}

	async expectNoTransactionsState() {
		await expect(this.noTransactionsState).toBeVisible();
	}

	async expectPageNumber(pageNum: number) {
		await expect(
			this.page.getByText(`Page ${pageNum} of`),
		).toBeVisible();
	}

	async expectPaginationVisible() {
		await expect(this.prevPageButton).toBeVisible();
		await expect(this.nextPageButton).toBeVisible();
	}

	async expectPaginationHidden() {
		await expect(this.prevPageButton).not.toBeVisible();
		await expect(this.nextPageButton).not.toBeVisible();
	}
}
