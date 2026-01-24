import type { Page } from "@playwright/test";

const BASE_URL = "http://localhost:4173";

interface SeedWallet {
	name: string;
	initialBalance?: number;
}

interface SeedCategory {
	name: string;
	type: "income" | "expense";
	icon?: string;
}

interface SeedTransaction {
	description: string;
	cents: number;
	type: "income" | "expense";
	walletId?: number;
	categoryId?: number;
	date?: string;
	paid?: boolean;
}

interface SeedResponse {
	wallet?: { id: number; name: string; initialBalance: number };
	category?: { id: number; name: string; type: string };
	transaction?: { id: number; description: string; cents: number };
}

/**
 * Seed test data via API
 */
export async function seedData(
	page: Page,
	data: {
		wallet?: SeedWallet;
		category?: SeedCategory;
		transaction?: SeedTransaction;
	},
): Promise<SeedResponse> {
	const response = await page.request.post(`${BASE_URL}/api/test/seed`, {
		data,
	});

	if (!response.ok()) {
		throw new Error(`Failed to seed data: ${response.status()} ${await response.text()}`);
	}

	return response.json();
}

/**
 * Cleanup test data via API
 */
export async function cleanupData(
	page: Page,
	data: {
		walletId?: number;
		categoryId?: number;
		transactionId?: number;
		all?: boolean;
	},
): Promise<void> {
	const response = await page.request.delete(`${BASE_URL}/api/test/seed`, {
		data,
	});

	if (!response.ok()) {
		throw new Error(
			`Failed to cleanup data: ${response.status()} ${await response.text()}`,
		);
	}
}

/**
 * Cleanup all test data for current user
 */
export async function cleanupAllData(page: Page): Promise<void> {
	await cleanupData(page, { all: true });
}

/**
 * Wait for network to be idle (useful after mutations)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
	await page.waitForLoadState("networkidle", { timeout });
}

/**
 * Wait for TanStack Query cache to be hydrated
 */
export async function waitForQueryCache(page: Page): Promise<void> {
	await page.waitForFunction(() => {
		// Check if the app has loaded and cache is hydrated
		return document.querySelector('[data-testid="app-loaded"]') !== null;
	});
}

/**
 * Take a full page screenshot with timestamp for debugging
 */
export async function debugScreenshot(page: Page, name: string): Promise<void> {
	const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	await page.screenshot({
		path: `e2e/.debug/${timestamp}-${name}.png`,
		fullPage: true,
	});
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
	return new Date().toISOString().split("T")[0];
}

/**
 * Get a date offset from today
 */
export function getDateOffset(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() + days);
	return date.toISOString().split("T")[0];
}
