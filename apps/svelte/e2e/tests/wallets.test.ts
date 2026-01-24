import { expect, test } from "@playwright/test";
import { WalletsPage } from "../pages";

test.describe("Wallets", () => {
	test("should load wallets page", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		await walletsPage.expectLoaded();
	});

	test("should open create wallet dialog", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		await walletsPage.openCreateDialog();
		await expect(walletsPage.dialog).toBeVisible();
		await expect(walletsPage.walletNameInput).toBeVisible();
		await expect(walletsPage.initialBalanceInput).toBeVisible();
	});

	test("should create a new wallet", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		const walletName = `Test Wallet ${Date.now()}`;
		await walletsPage.createWallet(walletName, 1000);

		// Dialog should close
		await expect(walletsPage.dialog).not.toBeVisible();

		// Wallet should appear in the list
		await walletsPage.expectWalletVisible(walletName);
	});

	test("should edit a wallet", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		// First create a wallet
		const originalName = `Edit Test ${Date.now()}`;
		await walletsPage.createWallet(originalName, 500);
		await expect(walletsPage.dialog).not.toBeVisible();
		await walletsPage.expectWalletVisible(originalName);

		// Now edit it
		const newName = `Edited ${Date.now()}`;
		await walletsPage.editWallet(originalName, newName, 1500);

		await expect(walletsPage.dialog).not.toBeVisible();
		await walletsPage.expectWalletVisible(newName);
		await walletsPage.expectWalletNotVisible(originalName);
	});

	test("should delete a wallet", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		// First create a wallet
		const walletName = `Delete Test ${Date.now()}`;
		await walletsPage.createWallet(walletName);
		await expect(walletsPage.dialog).not.toBeVisible();
		await walletsPage.expectWalletVisible(walletName);

		// Now delete it
		await walletsPage.deleteWallet(walletName);

		// Wallet should no longer be visible
		await walletsPage.expectWalletNotVisible(walletName);
	});
});
