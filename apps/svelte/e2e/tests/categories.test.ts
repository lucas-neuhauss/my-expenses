import { expect, test } from "@playwright/test";
import { CategoriesPage } from "../pages";

test.describe("Categories", () => {
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
});
