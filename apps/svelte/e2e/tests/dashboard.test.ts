import { expect, test } from "@playwright/test";
import { CategoriesPage, DashboardPage, TransactionDialog, WalletsPage } from "../pages";

// Helper to set up test data (wallet + categories)
async function setupTestData(page: import("@playwright/test").Page) {
	const walletsPage = new WalletsPage(page);
	const categoriesPage = new CategoriesPage(page);

	// Create a test wallet
	await walletsPage.goto();
	await walletsPage.createWallet("Test Wallet", 1000);
	await expect(walletsPage.dialog).not.toBeVisible();

	// Create an expense category
	await categoriesPage.goto();
	await categoriesPage.createCategory("Test Expense Cat", "expense");
	await expect(categoriesPage.dialog).not.toBeVisible();

	// Create an income category
	await page.goto("/categories?type=income");
	await categoriesPage.createCategory("Test Income Cat", "income");
	await expect(categoriesPage.dialog).not.toBeVisible();
}

test.describe("Dashboard", () => {
	test("should load dashboard with balance cards", async ({ page }) => {
		const dashboard = new DashboardPage(page);
		await dashboard.goto();

		await dashboard.expectLoaded();

		// Verify balance cards are visible
		await expect(dashboard.balanceCard).toBeVisible();
		await expect(dashboard.incomeCard).toBeVisible();
		await expect(dashboard.expenseCard).toBeVisible();
	});

	test("should open create transaction dialog", async ({ page }) => {
		// Setup required data first
		await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();
		await dashboard.openCreateTransaction();

		await transactionDialog.expectOpen();
	});

	test("should create an expense transaction", async ({ page }) => {
		// Setup required data first
		await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();
		await dashboard.openCreateTransaction();

		const description = `Test Expense ${Date.now()}`;
		await transactionDialog.createExpense({
			description,
			value: 50.0,
		});

		// Dialog should close
		await transactionDialog.expectClosed();

		// Transaction should appear in the table
		await dashboard.expectTransactionVisible(description);
	});

	test("should create an income transaction", async ({ page }) => {
		// Setup required data first
		await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();
		await dashboard.openCreateTransaction();

		const description = `Test Income ${Date.now()}`;
		await transactionDialog.createIncome({
			description,
			value: 100.0,
		});

		await transactionDialog.expectClosed();
		await dashboard.expectTransactionVisible(description);
	});

	test("should navigate between months", async ({ page }) => {
		const dashboard = new DashboardPage(page);
		await dashboard.goto();
		await dashboard.expectLoaded();

		// Get current month from URL or page
		const initialUrl = page.url();

		// Go to previous month
		await dashboard.goToPreviousMonth();

		// URL should have month param
		await expect(page).not.toHaveURL(initialUrl);

		// Go back to next month
		await dashboard.goToNextMonth();
	});

	test("should filter by wallet", async ({ page }) => {
		const dashboard = new DashboardPage(page);
		await dashboard.goto();
		await dashboard.expectLoaded();

		// Open wallet filter
		await dashboard.walletSelect.click();

		// Check that options are visible
		await expect(page.getByRole("option", { name: "All Wallets" })).toBeVisible();
	});

	test("should filter by status", async ({ page }) => {
		const dashboard = new DashboardPage(page);
		await dashboard.goto();
		await dashboard.expectLoaded();

		// Open status filter
		await dashboard.statusSelect.click();

		// Check that options are visible
		await expect(page.getByRole("option", { name: "All" })).toBeVisible();
		await expect(page.getByRole("option", { name: "Paid", exact: true })).toBeVisible();
		await expect(page.getByRole("option", { name: "Not Paid" })).toBeVisible();
	});
});
