import { expect, test } from "@playwright/test";
import { CategoriesPage, SubscriptionsPage, WalletsPage } from "../pages";

// Helper to set up test data (wallet + categories)
async function setupTestData(page: import("@playwright/test").Page) {
	// Visit subscriptions page first to ensure the authed route is ready,
	// then create a wallet and a category on their respective pages.
	const subscriptionsPage = new SubscriptionsPage(page);
	await subscriptionsPage.goto();
	await subscriptionsPage.expectLoaded();

	// Create wallet
	const walletsPage = new WalletsPage(page);
	await walletsPage.goto();
	const walletName = `Test Wallet ${Date.now()}`;
	await walletsPage.createWallet(walletName, 1000);
	await expect(walletsPage.dialog).not.toBeVisible();
	await walletsPage.expectWalletVisible(walletName);

	// Create category
	const categoriesPage = new CategoriesPage(page);
	await categoriesPage.goto();
	const categoryName = `Test Category ${Date.now()}`;
	await categoriesPage.createCategory(categoryName, "expense");
	await expect(categoriesPage.dialog).not.toBeVisible();
	await categoriesPage.expectCategoryVisible(categoryName);

	// Navigate back to subscriptions with a full reload. SPA navigation
	// does not re-fetch the wallet/category collections, so the selects in
	// the upsert dialog would otherwise render empty after creating the
	// data above.
	await subscriptionsPage.goto();
	await subscriptionsPage.expectLoaded();

	return { walletName, categoryName, subscriptionsPage };
}

test.describe("Subscriptions", () => {
	test("should load subscriptions page", async ({ page }) => {
		const subscriptionsPage = new SubscriptionsPage(page);
		await subscriptionsPage.goto();

		await subscriptionsPage.expectLoaded();
	});

	test("should open create subscription dialog", async ({ page }) => {
		const subscriptionsPage = new SubscriptionsPage(page);
		await subscriptionsPage.goto();

		await subscriptionsPage.openCreateDialog();
		await expect(subscriptionsPage.dialog).toBeVisible();
		await expect(subscriptionsPage.nameInput).toBeVisible();
		await expect(subscriptionsPage.amountInput).toBeVisible();
	});

	test("should create a new subscription", async ({ page }) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		const subscriptionName = `Test Subscription ${Date.now()}`;
		await subscriptionsPage.createSubscription({
			name: subscriptionName,
			amount: 29.99,
			categoryName,
			walletName,
			dayOfMonth: 15,
		});

		// Dialog should close
		await expect(subscriptionsPage.dialog).not.toBeVisible();

		// Subscription should appear in the list
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);
	});

	test("should edit a subscription", async ({ page }) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		// First create a subscription
		const originalName = `Edit Test ${Date.now()}`;
		await subscriptionsPage.createSubscription({
			name: originalName,
			amount: 9.99,
			categoryName,
			walletName,
		});
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(originalName);

		// Now edit it
		const newName = `Edited ${Date.now()}`;
		await subscriptionsPage.editSubscription(originalName, newName, 19.99);

		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(newName);
		await subscriptionsPage.expectSubscriptionNotVisible(originalName);
	});

	test("should delete a subscription", async ({ page }) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		// First create a subscription
		const subscriptionName = `Delete Test ${Date.now()}`;
		await subscriptionsPage.createSubscription({
			name: subscriptionName,
			amount: 15.0,
			categoryName,
			walletName,
		});
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);

		// Now delete it
		await subscriptionsPage.deleteSubscription(subscriptionName);

		// Subscription should no longer be visible
		await subscriptionsPage.expectSubscriptionNotVisible(subscriptionName);
	});

	test("should pause and resume a subscription", async ({ page }) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		// First create a subscription
		const subscriptionName = `Pause Test ${Date.now()}`;
		await subscriptionsPage.createSubscription({
			name: subscriptionName,
			amount: 49.99,
			categoryName,
			walletName,
		});
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);

		// Should be active by default
		await subscriptionsPage.expectSubscriptionActive(subscriptionName);

		// Pause the subscription. A paused subscription leaves the active
		// tab reactively (it moves to the paused tab), so switch tabs first
		// and assert the paused state there.
		await subscriptionsPage.togglePauseSubscription(subscriptionName);
		await subscriptionsPage.switchToPausedTab();
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);
		await subscriptionsPage.expectSubscriptionPaused(subscriptionName);

		// Resume the subscription. It leaves the paused tab reactively and
		// moves back to the active tab.
		await subscriptionsPage.togglePauseSubscription(subscriptionName);
		await subscriptionsPage.switchToActiveTab();
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);
		await subscriptionsPage.expectSubscriptionActive(subscriptionName);
	});

	test("subscription appears optimistically before server response resolves", async ({
		page,
	}) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		const subscriptionName = `Optimistic Sub ${Date.now()}`;
		await subscriptionsPage.openCreateDialog();
		await subscriptionsPage.nameInput.fill(subscriptionName);
		await subscriptionsPage.amountInput.fill("29.99");

		// Select category
		await subscriptionsPage.categoryCombobox.click();
		await page.waitForTimeout(300);
		const categoryOption = page.getByText(categoryName).first();
		if (await categoryOption.isVisible({ timeout: 3000 }).catch(() => false)) {
			await categoryOption.click();
		}

		// Select wallet
		await subscriptionsPage.walletSelectTrigger.click();
		await page.waitForTimeout(200);
		const walletOption = page.getByRole("option", { name: walletName });
		if (await walletOption.isVisible({ timeout: 3000 }).catch(() => false)) {
			await walletOption.click();
		}

		await subscriptionsPage.saveButton.click();

		// The optimistic write should make the subscription visible before the dialog
		// closes (the dialog waits for the server response).
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(subscriptionName);
	});

	test("subscription edit appears optimistically before server response resolves", async ({
		page,
	}) => {
		const { walletName, categoryName, subscriptionsPage } = await setupTestData(page);

		// First create a subscription
		const originalName = `Edit Optimistic ${Date.now()}`;
		await subscriptionsPage.createSubscription({
			name: originalName,
			amount: 9.99,
			categoryName,
			walletName,
		});
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(originalName);

		// Edit it
		const newName = `Edited Optimistic ${Date.now()}`;
		await subscriptionsPage.editSubscription(originalName, newName, 19.99);

		// The optimistic write should make the new name visible immediately
		await subscriptionsPage.expectSubscriptionVisible(newName);
		await expect(subscriptionsPage.dialog).not.toBeVisible();
		await subscriptionsPage.expectSubscriptionVisible(newName);
	});
});
