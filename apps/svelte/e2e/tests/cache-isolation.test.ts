import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { cleanupData, seedData } from "../utils/helpers";

test("logout clears financial caches and a second account never sees the first account's wallets", async ({
	page,
}) => {
	const privateWallet = `Private A ${randomUUID()}`;
	const { wallet } = await seedData(page, { wallet: { name: privateWallet } });
	await page.goto("/wallets");
	await expect(page.getByText(privateWallet, { exact: true })).toBeVisible();

	const cachedValues = () =>
		page.evaluate(
			() =>
				new Promise<string[]>((resolve, reject) => {
					const open = indexedDB.open("keyval-store");
					open.onerror = () => reject(open.error);
					open.onsuccess = () => {
						const db = open.result;
						if (!db.objectStoreNames.contains("keyval")) {
							db.close();
							resolve([]);
							return;
						}
						const request = db.transaction("keyval").objectStore("keyval").getAll();
						request.onerror = () => {
							db.close();
							reject(request.error);
						};
						request.onsuccess = () => {
							db.close();
							resolve(
								request.result.filter(
									(value): value is string => typeof value === "string",
								),
							);
						};
					};
				}),
		);
	await expect
		.poll(async () =>
			(await cachedValues()).some((value) => value.includes(privateWallet)),
		)
		.toBe(true);

	await page.getByRole("button", { name: "Logout", exact: true }).click();
	await expect(page).toHaveURL(/\/login/);
	expect(await cachedValues()).toEqual([]);

	const email = `cache-isolation-${randomUUID()}@example.test`;
	await page.goto("/register");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("password");
	await page.getByRole("button", { name: "Register", exact: true }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill("password");
	await page.getByRole("button", { name: "Login", exact: true }).click();
	await expect(page).toHaveURL("/");
	await page.getByRole("link", { name: "Wallets", exact: true }).click();
	await expect(page.getByText("Bank", { exact: true })).toBeVisible();
	await expect(page.getByText(privateWallet, { exact: true })).toHaveCount(0);
	await expect.poll(async () => (await cachedValues()).length).toBeGreaterThan(0);
	expect((await cachedValues()).some((value) => value.includes(privateWallet))).toBe(
		false,
	);

	// Clean up the original test wallet under its own session.
	await page.getByRole("button", { name: "Logout", exact: true }).click();
	await expect(page).toHaveURL(/\/login/);
	await page.getByLabel("Email").fill("test@email.com");
	await page.getByLabel("Password").fill("password");
	await page.getByRole("button", { name: "Login", exact: true }).click();
	await expect(page).toHaveURL("/");
	if (wallet) await cleanupData(page, { walletId: wallet.id });
});
