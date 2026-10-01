import { expect, test } from "@playwright/test";
import { cleanupData, getTodayDate, seedData } from "../utils/helpers";

test("chart tooltips display category HTML as text without executing it", async ({
	page,
}) => {
	const name = '<img src=x onerror="document.documentElement.dataset.chartXss=1">';
	const { wallet, category } = await seedData(page, {
		wallet: { name: "Tooltip test wallet" },
		category: { name, type: "expense", icon: "house.png" },
	});
	const { transaction } = await seedData(page, {
		transaction: {
			description: "Tooltip test expense",
			cents: -1250,
			type: "expense",
			walletId: wallet!.id,
			categoryId: category!.id,
			date: getTodayDate(),
			paid: true,
		},
	});
	try {
		await page.goto("/");
		const canvas = page.locator("#dashboard-charts canvas").first();
		await expect(canvas).toBeVisible();
		const box = await canvas.boundingBox();
		if (!box) throw new Error("Chart has no dimensions");
		const tooltip = page.locator(".dashboard-chart-tooltip").filter({ hasText: name });
		// Retry the hover while ECharts finishes its initial animation/data updates.
		await expect(async () => {
			await canvas.hover({ position: { x: 10, y: 10 } });
			await canvas.hover({ position: { x: box.width / 2 + 10, y: box.height / 2 } });
			await expect(tooltip).toBeVisible({ timeout: 500 });
		}).toPass({ timeout: 10000 });
		await expect(tooltip.locator("img")).toHaveCount(0);
		expect(
			await page.evaluate(() => document.documentElement.dataset.chartXss),
		).toBeUndefined();
	} finally {
		if (transaction) await cleanupData(page, { transactionId: transaction.id });
		if (category) await cleanupData(page, { categoryId: category.id });
		if (wallet) await cleanupData(page, { walletId: wallet.id });
	}
});
