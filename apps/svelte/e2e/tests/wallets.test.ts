import { expect, test } from "@playwright/test";
import { WalletsPage } from "../pages";
import { cleanupData, getTodayDate, seedData } from "../utils";

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

	test("wallet appears optimistically before server response resolves", async ({
		page,
	}) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		const walletName = `Optimistic ${Date.now()}`;
		await walletsPage.openCreateDialog();
		await walletsPage.walletNameInput.fill(walletName);
		await walletsPage.initialBalanceInput.fill("10.50");
		await walletsPage.saveButton.click();

		// The optimistic write should make the wallet visible before the dialog
		// closes (the dialog waits for the server response).
		await walletsPage.expectWalletVisible(walletName);
		await expect(walletsPage.dialog).not.toBeVisible();
		await walletsPage.expectWalletVisible(walletName);
	});

	test("wallet delete rolls back if server rejects", async ({ page }) => {
		const walletsPage = new WalletsPage(page);
		await walletsPage.goto();

		// Seed a wallet and a transaction so the delete is rejected by the server.
		const walletName = `Rollback ${Date.now()}`;
		const seededWallet = await seedData(page, {
			wallet: { name: walletName, initialBalance: 100000 },
		});
		const walletId = seededWallet.wallet!.id;

		const seededCategory = await seedData(page, {
			category: { name: `Rollback Cat ${Date.now()}`, type: "expense" },
		});
		const categoryId = seededCategory.category!.id;

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

		// Reload so the seeded wallet is visible.
		await walletsPage.goto();
		await walletsPage.expectWalletVisible(walletName);

		// Try to delete the wallet.
		await walletsPage.deleteWallet(walletName);

		// The optimistic delete removes it, but the server rejection rolls it back.
		await walletsPage.expectWalletVisible(walletName);

		// Cleanup seeded data.
		await cleanupData(page, { walletId, all: true });
	});
});
