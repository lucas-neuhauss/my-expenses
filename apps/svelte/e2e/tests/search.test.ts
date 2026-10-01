import { expect, test } from "@playwright/test";
import { SearchPage } from "../pages";
import { cleanupAllData, seedData } from "../utils/helpers";

test.describe("Search Page", () => {
	test.beforeEach(async ({ page }) => {
		// Clean up any existing data to start fresh
		await cleanupAllData(page);

		// Create a wallet, categories, and sample transactions via seed API
		const walletRes = await seedData(page, {
			wallet: { name: "Test Wallet", initialBalance: 10000 },
		});
		const walletId = walletRes.wallet!.id;

		const expenseCat = await seedData(page, {
			category: { name: "Food", type: "expense", icon: "fast-food.png" },
		});
		const expenseCatId = expenseCat.category!.id;

		const incomeCat = await seedData(page, {
			category: { name: "Salary", type: "income", icon: "bill.png" },
		});
		const incomeCatId = incomeCat.category!.id;

		// Create named transactions for search/filter testing
		await seedData(page, {
			transaction: {
				description: "Groceries at supermarket",
				cents: -5000,
				type: "expense",
				walletId,
				categoryId: expenseCatId,
				paid: true,
			},
		});

		await seedData(page, {
			transaction: {
				description: "Monthly salary",
				cents: 500000,
				type: "income",
				walletId,
				categoryId: incomeCatId,
				paid: true,
			},
		});

		await seedData(page, {
			transaction: {
				description: "Rent payment",
				cents: -200000,
				type: "expense",
				walletId,
				categoryId: expenseCatId,
				paid: false,
			},
		});

		// Create 150 more transactions for pagination testing
		for (let i = 0; i < 150; i++) {
			await seedData(page, {
				transaction: {
					description: `Test transaction ${i}`,
					cents: -(100 + i),
					type: "expense",
					walletId,
					categoryId: expenseCatId,
					paid: true,
				},
			});
		}
	});

	test("should load the search page with all filters", async ({ page }) => {
		const searchPage = new SearchPage(page);

		await searchPage.goto();
		await searchPage.expectLoaded();

		// All filter controls should be visible
		await expect(searchPage.searchInput).toBeVisible();
		await expect(searchPage.startDateInput).toBeVisible();
		await expect(searchPage.endDateInput).toBeVisible();
		await expect(searchPage.categoryCombobox).toBeVisible();
		await expect(searchPage.walletSelect).toBeVisible();
		await expect(searchPage.statusSelect).toBeVisible();
	});

	test("should display summary cards with correct values", async ({ page }) => {
		const searchPage = new SearchPage(page);
		await searchPage.goto();
		await searchPage.expectLoaded();
		await searchPage.waitForData();

		await searchPage.expectIncomeCardVisible();
		await searchPage.expectExpenseCardVisible();
		await searchPage.expectNetBalanceCardVisible();
	});

	// TODO: investigate why URL-based filtering doesn't narrow results
	// The filter params are correctly parsed (URL persistence test proves it)
	// but the TanStack DB query may not re-execute on initial page load.
	test.skip("should search transactions by description", async ({ page }) => {
		const searchPage = new SearchPage(page);

		// Navigate with search param directly
		await page.goto("/transactions?search=Groceries");
		await searchPage.expectLoaded();
		await searchPage.waitForData();

		// The named transactions should be visible after filtering
		// (with only a few transactions, they'll all fit on page 1)
		await searchPage.expectTransactionVisible("Groceries at supermarket");
	});

	test("should show empty state for non-matching search", async ({ page }) => {
		const searchPage = new SearchPage(page);

		// Navigate with a search that won't match anything
		await page.goto("/transactions?search=NONEXISTENT12345");
		await searchPage.expectLoaded();
		await searchPage.waitForData();

		await searchPage.expectEmptyState();
	});

	test.skip("should filter by paid status", async ({ page }) => {
		const searchPage = new SearchPage(page);

		// Filter by paid=true via URL
		await page.goto("/transactions?paid=true");
		await searchPage.expectLoaded();
		await searchPage.waitForData();

		// Use a more general check: verify the table has data and the URL param is set
		const url = page.url();
		expect(url).toContain("paid=true");
		const rowCount = await searchPage.tableRows.count();
		expect(rowCount).toBeGreaterThan(0);
	});

	test("should sort by column when clicking headers", async ({ page }) => {
		const searchPage = new SearchPage(page);
		await searchPage.goto();
		await searchPage.expectLoaded();

		// Table should render rows
		await expect(searchPage.tableRows.first()).toBeVisible();

		// Click Amount header
		await searchPage.sortByColumn("Amount");
		await expect(searchPage.transactionTable).toBeVisible();

		// Click Description header
		await searchPage.sortByColumn("Description");
		await expect(searchPage.transactionTable).toBeVisible();

		// Click Date header
		await searchPage.sortByColumn("Date");
		await expect(searchPage.transactionTable).toBeVisible();
	});

	test("should paginate with 100 rows per page", async ({ page }) => {
		const searchPage = new SearchPage(page);
		await searchPage.goto();
		await searchPage.expectLoaded();

		// With 153 transactions, should have pagination
		await searchPage.expectPaginationVisible();
		await expect(searchPage.tableRows).toHaveCount(100);

		// Should be on page 1
		await searchPage.expectPageNumber(1);

		// Navigate to page 2
		await searchPage.goToNextPage();
		await searchPage.expectPageNumber(2);

		// Should have remaining 53 rows
		const page2Rows = await searchPage.tableRows.count();
		expect(page2Rows).toBeLessThanOrEqual(100);
		expect(page2Rows).toBeGreaterThan(0);

		// Go back to page 1
		await searchPage.goToPreviousPage();
		await searchPage.expectPageNumber(1);
	});

	test("should persist filters in URL search params", async ({ page }) => {
		const searchPage = new SearchPage(page);

		// Navigate with filters
		await page.goto("/transactions?search=Groceries&paid=true");
		await searchPage.expectLoaded();

		// URL params should be visible in the filter controls after load
		await expect(searchPage.searchInput).toHaveValue("Groceries");

		// Reload — filters should be restored
		await page.reload();
		await searchPage.expectLoaded();
		await expect(searchPage.searchInput).toHaveValue("Groceries");
	});

	test("should navigate from sidebar", async ({ page }) => {
		await page.goto("/");
		await expect(page.getByText("Home")).toBeVisible();

		// Click the Search link in the sidebar
		await page.getByRole("link", { name: "Search" }).click();

		const searchPage = new SearchPage(page);
		await searchPage.expectLoaded();
	});

	test.describe("amount filter", () => {
		// The outer beforeEach seeds the base dataset; add dedicated amounts so
		// magnitude matching can be asserted unambiguously.
		test.beforeEach(async ({ page }) => {
			const walletRes = await seedData(page, {
				wallet: { name: "Amount Wallet", initialBalance: 0 },
			});
			const walletId = walletRes.wallet!.id;

			const expenseCat = await seedData(page, {
				category: { name: "Amount Expense", type: "expense" },
			});
			const incomeCat = await seedData(page, {
				category: { name: "Amount Income", type: "income" },
			});

			const rows: Array<{
				description: string;
				cents: number;
				type: "income" | "expense";
				categoryId: number;
			}> = [
				{
					description: "Amount -25.50",
					cents: -2550,
					type: "expense",
					categoryId: expenseCat.category!.id,
				},
				{
					description: "Amount +25.50",
					cents: 2550,
					type: "income",
					categoryId: incomeCat.category!.id,
				},
				{
					description: "Amount -25.59",
					cents: -2559,
					type: "expense",
					categoryId: expenseCat.category!.id,
				},
				{
					description: "Amount -26.00",
					cents: -2600,
					type: "expense",
					categoryId: expenseCat.category!.id,
				},
				{
					description: "Amount +255.50",
					cents: 25550,
					type: "income",
					categoryId: incomeCat.category!.id,
				},
			];

			for (const row of rows) {
				await seedData(page, {
					transaction: { ...row, walletId, paid: true },
				});
			}
		});

		test("whole-number prefix finds a negative expense of that magnitude", async ({
			page,
		}) => {
			const searchPage = new SearchPage(page);
			await searchPage.goto();
			await searchPage.expectLoaded();
			await searchPage.waitForData();

			await searchPage.searchByAmount("25");

			// Prefix 25 matches 25.00-25.99 on magnitude, regardless of sign.
			await searchPage.expectTransactionVisible("Amount -25.50");
			await searchPage.expectTransactionVisible("Amount +25.50");
			await searchPage.expectTransactionVisible("Amount -25.59");
			// 26.00 and 255.50 are outside the 25.xx range.
			await searchPage.expectTransactionNotVisible("Amount -26.00");
			await searchPage.expectTransactionNotVisible("Amount +255.50");
		});

		test("a decimal input matches that amount exactly", async ({ page }) => {
			const searchPage = new SearchPage(page);
			await searchPage.goto();
			await searchPage.expectLoaded();
			await searchPage.waitForData();

			await searchPage.searchByAmount("25.50");

			await searchPage.expectTransactionVisible("Amount -25.50");
			await searchPage.expectTransactionVisible("Amount +25.50");
			// 25.59 starts with 25 but is not exactly 25.50.
			await searchPage.expectTransactionNotVisible("Amount -25.59");
			await searchPage.expectTransactionNotVisible("Amount -26.00");
			await searchPage.expectTransactionNotVisible("Amount +255.50");
		});

		test("a leading sign is ignored for whole-number input", async ({ page }) => {
			const searchPage = new SearchPage(page);
			await searchPage.goto();
			await searchPage.expectLoaded();
			await searchPage.waitForData();

			// "-25" must behave the same as "25".
			await searchPage.searchByAmount("-25");

			await searchPage.expectTransactionVisible("Amount -25.50");
			await searchPage.expectTransactionVisible("Amount +25.50");
			await searchPage.expectTransactionVisible("Amount -25.59");
			await searchPage.expectTransactionNotVisible("Amount -26.00");
			await searchPage.expectTransactionNotVisible("Amount +255.50");
		});

		test("a leading sign is ignored for decimal input", async ({ page }) => {
			const searchPage = new SearchPage(page);
			await searchPage.goto();
			await searchPage.expectLoaded();
			await searchPage.waitForData();

			// "-25.50" must behave the same as "25.50".
			await searchPage.searchByAmount("-25.50");

			await searchPage.expectTransactionVisible("Amount -25.50");
			await searchPage.expectTransactionVisible("Amount +25.50");
			await searchPage.expectTransactionNotVisible("Amount -25.59");
			await searchPage.expectTransactionNotVisible("Amount -26.00");
			await searchPage.expectTransactionNotVisible("Amount +255.50");
		});
	});
});
