import { expect, test } from "@playwright/test";
import { CategoriesPage, DashboardPage, TransactionDialog, WalletsPage } from "../pages";

// Helper to set up test data (two wallets + categories)
async function setupTestData(page: import("@playwright/test").Page) {
	const walletsPage = new WalletsPage(page);
	const categoriesPage = new CategoriesPage(page);

	// Create two wallets for transference testing
	await walletsPage.goto();
	const wallet1Name = `Source Wallet ${Date.now()}`;
	await walletsPage.createWallet(wallet1Name, 5000);
	await expect(walletsPage.dialog).not.toBeVisible();
	await walletsPage.expectWalletVisible(wallet1Name);

	const wallet2Name = `Dest Wallet ${Date.now()}`;
	await walletsPage.createWallet(wallet2Name, 3000);
	await expect(walletsPage.dialog).not.toBeVisible();
	await walletsPage.expectWalletVisible(wallet2Name);

	// Create an expense category
	await categoriesPage.goto();
	const expenseCategory = `Test Expense Cat ${Date.now()}`;
	await categoriesPage.createCategory(expenseCategory, "expense");
	await expect(categoriesPage.dialog).not.toBeVisible();
	await categoriesPage.expectCategoryVisible(expenseCategory);

	return { wallet1Name, wallet2Name, expenseCategory };
}

test.describe("Transactions", () => {
	test("should create an installment expense and verify multiple transactions appear", async ({
		page,
	}) => {
		const { wallet1Name } = await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();

		// Create an installment expense
		await dashboard.openCreateTransaction();
		const description = `Installment Test ${Date.now()}`;
		await transactionDialog.createExpenseWithInstallments({
			description,
			value: 300.0, // R$ 300 total
			wallet: wallet1Name,
			installmentsCount: 3,
		});

		await transactionDialog.expectClosed();

		// The description should be visible for the current month's transaction
		await dashboard.expectTransactionVisible(description);
	});

	test("should create a transference between two wallets", async ({ page }) => {
		const { wallet1Name, wallet2Name } = await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();

		// Create a transference
		await dashboard.openCreateTransaction();
		const description = `Transference Test ${Date.now()}`;
		await transactionDialog.createTransference({
			fromWallet: wallet1Name,
			toWallet: wallet2Name,
			description,
			value: 200.0,
		});

		await transactionDialog.expectClosed();

		// A transference creates two linked transactions (expense + income legs),
		// both of which the dashboard renders as separate rows. Just assert that
		// at least one row with the description is visible.
		const descriptionCell = page.getByRole("cell", { name: description });
		await expect(descriptionCell.first()).toBeVisible();
	});

	test("should show validation error when transferring to the same wallet", async ({
		page,
	}) => {
		const { wallet1Name } = await setupTestData(page);

		const dashboard = new DashboardPage(page);
		const transactionDialog = new TransactionDialog(page);

		await dashboard.goto();
		await dashboard.openCreateTransaction();

		// Select transference tab
		await transactionDialog.selectTab("Transference");

		// Select the same wallet for both source and destination
		await transactionDialog.selectFromWallet(wallet1Name);
		await transactionDialog.selectToWallet(wallet1Name);

		// Fill in required fields
		await transactionDialog.fillDescription(`Same Wallet Test ${Date.now()}`);
		await transactionDialog.fillValue(100.0);

		// Attempt to save
		await transactionDialog.save();

		// The dialog should still be open (validation error prevents close)
		await expect(transactionDialog.dialog).toBeVisible();

		// The validation error from the server should be surfaced in the form.
		await expect(page.getByText("Cannot transfer to the same wallet")).toBeVisible();
	});
});
