import { expect, type Page } from "@playwright/test";

export class CategoriesPage {
	constructor(private page: Page) {}

	// Locators
	get createCategoryButton() {
		return this.page.getByRole("button", { name: "Create Category" });
	}

	get expenseTab() {
		return this.page.getByRole("tab", { name: "Expense" });
	}

	get incomeTab() {
		return this.page.getByRole("tab", { name: "Income" });
	}

	categoryCard(name: string) {
		return this.page.locator('[data-slot="card"]').filter({ hasText: name });
	}

	// Dialog locators
	get dialog() {
		return this.page.getByRole("dialog");
	}

	get categoryNameInput() {
		// The textbox may not have proper accessible name on Income tab
		// Use locator that finds the textbox in the Category section
		return this.dialog.getByRole("textbox").first();
	}

	get categoryTypeExpenseTab() {
		return this.dialog.getByRole("tab", { name: "Expense" });
	}

	get categoryTypeIncomeTab() {
		return this.dialog.getByRole("tab", { name: "Income" });
	}

	get iconCombobox() {
		return this.dialog.locator("[data-icon-combobox]");
	}

	get saveButton() {
		return this.dialog.getByRole("button", { name: /Save|Create/ });
	}

	get confirmDeleteButton() {
		return this.page.getByRole("button", { name: "Continue" });
	}

	// Actions
	async goto() {
		await this.page.goto("/categories");
	}

	async switchToExpense() {
		await this.expenseTab.click();
	}

	async switchToIncome() {
		await this.incomeTab.click();
	}

	async openCreateDialog() {
		await this.createCategoryButton.click();
		await expect(this.dialog).toBeVisible();
	}

	async createCategory(name: string, type?: "expense" | "income") {
		await this.openCreateDialog();

		// Select type tab if specified
		if (type === "expense") {
			await this.categoryTypeExpenseTab.click();
		} else if (type === "income") {
			await this.categoryTypeIncomeTab.click();
		}

		await this.categoryNameInput.fill(name);
		await this.saveButton.click();
	}

	async editCategory(currentName: string, newName: string) {
		const card = this.categoryCard(currentName);
		await card.getByRole("button", { name: "Edit category" }).click();
		await expect(this.dialog).toBeVisible();

		await this.categoryNameInput.fill(newName);
		await this.saveButton.click();
	}

	async deleteCategory(name: string) {
		const card = this.categoryCard(name);
		await card.getByRole("button", { name: "Delete category" }).click();
		await this.confirmDeleteButton.click();
	}

	// Assertions
	async expectLoaded() {
		await expect(this.createCategoryButton).toBeVisible();
	}

	async expectCategoryVisible(name: string) {
		await expect(this.categoryCard(name)).toBeVisible();
	}

	async expectCategoryNotVisible(name: string) {
		await expect(this.categoryCard(name)).not.toBeVisible();
	}
}
