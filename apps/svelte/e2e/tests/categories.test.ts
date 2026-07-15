import { expect, test } from "@playwright/test";
import { CategoriesPage } from "../pages";
import { seedData, cleanupData, getTodayDate } from "../utils";

test.describe("Categories", () => {
	test.beforeEach(async ({ page }) => {
		page.on("console", (msg) => {
			if (msg.type() === "error") {
				console.log(`[BROWSER ERROR] ${msg.text()}`);
			}
		});
		page.on("requestfailed", (request) => {
			console.log(`[REQUEST FAILED] ${request.url()} - ${request.failure()?.errorText}`);
		});
	});
	test("should load categories page", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		await categoriesPage.expectLoaded();
	});

	test("should display expense and income tabs", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		await expect(categoriesPage.expenseTab).toBeVisible();
		await expect(categoriesPage.incomeTab).toBeVisible();
	});

	test("should switch between expense and income tabs", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		// Switch to income
		await categoriesPage.switchToIncome();
		await expect(page).toHaveURL(/type=income/);

		// Switch back to expense
		await categoriesPage.switchToExpense();
		await expect(page).toHaveURL(/type=expense|categories$/);
	});

	test("should open create category dialog", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		await categoriesPage.openCreateDialog();
		await expect(categoriesPage.dialog).toBeVisible();
		await expect(categoriesPage.categoryNameInput).toBeVisible();
	});

	test("should create a new expense category", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		const categoryName = `Test Category ${Date.now()}`;
		await categoriesPage.createCategory(categoryName, "expense");

		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(categoryName);
	});

	test("should create a new income category", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);

		// Start on income tab
		await page.goto("/categories?type=income");

		const categoryName = `Income Cat ${Date.now()}`;
		await categoriesPage.createCategory(categoryName, "income");

		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(categoryName);
	});

	test("should edit a category", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		// First create a category
		const originalName = `Edit Cat ${Date.now()}`;
		await categoriesPage.createCategory(originalName, "expense");
		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(originalName);

		// Now edit it
		const newName = `Edited Cat ${Date.now()}`;
		await categoriesPage.editCategory(originalName, newName);

		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(newName);
	});

	test("should delete a category", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		// First create a category
		const categoryName = `Delete Cat ${Date.now()}`;
		await categoriesPage.createCategory(categoryName, "expense");
		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(categoryName);

		// Now delete it
		await categoriesPage.deleteCategory(categoryName);

		// Category should no longer be visible
		await categoriesPage.expectCategoryNotVisible(categoryName);
	});

	test("category appears optimistically before server response resolves", async ({
		page,
	}) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		const categoryName = `Optimistic Cat ${Date.now()}`;
		await categoriesPage.openCreateDialog();
		await categoriesPage.categoryNameInput.fill(categoryName);
		await categoriesPage.saveButton.click();

		// The optimistic write should make the category visible before the dialog
		// closes (the dialog waits for the server response).
		await categoriesPage.expectCategoryVisible(categoryName);
		await expect(categoriesPage.dialog).not.toBeVisible();
		await categoriesPage.expectCategoryVisible(categoryName);
	});

	test("category delete rolls back if server rejects", async ({ page }) => {
		const categoriesPage = new CategoriesPage(page);
		await categoriesPage.goto();

		// Seed a category and a transaction so the delete is rejected by the server.
		const categoryName = `Rollback Cat ${Date.now()}`;
		const seededCategory = await seedData(page, {
			category: { name: categoryName, type: "expense" },
		});
		const categoryId = seededCategory.category!.id;

		const seededWallet = await seedData(page, {
			wallet: { name: `Rollback Wallet ${Date.now()}`, initialBalance: 100000 },
		});
		const walletId = seededWallet.wallet!.id;

		await seedData(page, {
			transaction: {
				description: "Block delete",
				cents: 1000,
				type: "expense",
				walletId,
				categoryId,
				date: getTodayDate(),
				paid: true,
			},
		});

		// Reload so the seeded category is visible.
		await categoriesPage.goto();
		await categoriesPage.expectCategoryVisible(categoryName);

		// Try to delete the category.
		await categoriesPage.deleteCategory(categoryName);

		// The optimistic delete removes it, but the server rejection rolls it back.
		await categoriesPage.expectCategoryVisible(categoryName);

		// Cleanup seeded data.
		await cleanupData(page, { categoryId, walletId, all: true });
	});
});
