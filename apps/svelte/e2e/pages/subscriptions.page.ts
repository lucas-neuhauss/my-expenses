import { expect, type Page } from "@playwright/test";

export class SubscriptionsPage {
	constructor(private page: Page) {}

	// Locators
	get createSubscriptionButton() {
		return this.page.getByRole("button", { name: "Create Subscription" });
	}

	get activeTab() {
		return this.page.getByRole("tab", { name: /^Active/ });
	}

	get pausedTab() {
		return this.page.getByRole("tab", { name: /^Paused/ });
	}

	subscriptionCard(name: string) {
		return this.page.locator('[data-slot="card"]').filter({ hasText: name });
	}

	// Dialog locators
	get dialog() {
		return this.page.getByRole("dialog");
	}

	get nameInput() {
		return this.dialog.getByLabel("Name");
	}

	get amountInput() {
		return this.dialog.getByLabel("Amount");
	}

	get categoryCombobox() {
		return this.dialog.getByRole("combobox", { name: "Select category" });
	}

	get walletSelectTrigger() {
		return this.dialog.getByTestId("subscription-wallet-select");
	}

	get dayOfMonthSelectTrigger() {
		return this.dialog.getByTestId("subscription-day-of-month-select");
	}

	get saveButton() {
		return this.dialog.getByRole("button", { name: "Save" });
	}

	get confirmDeleteButton() {
		return this.page.getByRole("button", { name: "Continue" });
	}

	// Actions
	async goto() {
		await this.page.goto("/subscriptions");
	}

	async openCreateDialog() {
		// Wait for data to finish loading ("Loading..." disappears)
		await expect(this.page.getByText("Loading...")).not.toBeVisible({ timeout: 10000 });
		await this.createSubscriptionButton.click();
		await expect(this.dialog).toBeVisible();
		// Wait for the dialog to settle (Svelte reactive bindings update)
		await this.page.waitForTimeout(500);
	}

	async createSubscription(data: {
		name: string;
		amount: number;
		categoryName?: string;
		walletName?: string;
		dayOfMonth?: number;
	}) {
		// Open dialog and fill text fields
		await this.openCreateDialog();
		await this.nameInput.fill(data.name);
		await this.amountInput.fill(String(data.amount));

		if (data.categoryName) {
			await this.categoryCombobox.click();
			await this.page.waitForTimeout(300);
			const option = this.page.getByText(data.categoryName).first();
			if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
				await option.click();
			}
		}

		if (data.walletName) {
			await this.walletSelectTrigger.click();
			await this.page.waitForTimeout(200);
			const option = this.page.getByRole("option", { name: data.walletName });
			if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
				await option.click();
			}
		}

		if (data.dayOfMonth !== undefined) {
			await this.dayOfMonthSelectTrigger.click();
			await this.page.waitForTimeout(200);
			const option = this.page.getByRole("option", { name: String(data.dayOfMonth) });
			if (await option.isVisible({ timeout: 3000 }).catch(() => false)) {
				await option.click();
			}
		}

		await this.saveButton.click();
	}

	async editSubscription(currentName: string, newName: string, newAmount?: number) {
		const card = this.subscriptionCard(currentName);
		await card.getByRole("button", { name: "Edit subscription" }).click();
		await expect(this.dialog).toBeVisible();

		await this.nameInput.fill(newName);
		if (newAmount !== undefined) {
			await this.amountInput.fill(String(newAmount));
		}
		await this.saveButton.click();
	}

	async deleteSubscription(name: string) {
		const card = this.subscriptionCard(name);
		await card.getByRole("button", { name: "Delete subscription" }).click();
		await this.confirmDeleteButton.click();
	}

	async togglePauseSubscription(name: string) {
		const card = this.subscriptionCard(name);
		const pauseButton = card.getByRole("button", {
			name: /Pause subscription|Resume subscription/,
		});
		await pauseButton.click();
	}

	async switchToPausedTab() {
		await this.pausedTab.click();
	}

	async switchToActiveTab() {
		await this.activeTab.click();
	}

	// Assertions
	async expectLoaded() {
		await expect(this.createSubscriptionButton).toBeVisible();
	}

	async expectSubscriptionVisible(name: string) {
		await expect(this.subscriptionCard(name)).toBeVisible();
	}

	async expectSubscriptionNotVisible(name: string) {
		await expect(this.subscriptionCard(name)).not.toBeVisible();
	}

	async expectEmptyState() {
		await expect(this.page.getByText("No active subscriptions")).toBeVisible();
	}

	async expectPausedEmptyState() {
		await expect(this.page.getByText("No paused subscriptions")).toBeVisible();
	}

	async expectSubscriptionPaused(name: string) {
		const card = this.subscriptionCard(name);
		// Paused subscriptions should have a "Resume subscription" button
		await expect(card.getByRole("button", { name: "Resume subscription" })).toBeVisible();
	}

	async expectSubscriptionActive(name: string) {
		const card = this.subscriptionCard(name);
		// Active subscriptions should have a "Pause subscription" button
		await expect(card.getByRole("button", { name: "Pause subscription" })).toBeVisible();
	}
}
