import { faker } from "@faker-js/faker";

/**
 * Factory for creating wallet test data
 */
export function createWallet(overrides: Partial<WalletData> = {}): WalletData {
	return {
		name: faker.finance.accountName(),
		initialBalance: faker.number.int({ min: 0, max: 100000 }),
		...overrides,
	};
}

interface WalletData {
	name: string;
	initialBalance: number;
}

/**
 * Factory for creating category test data
 */
export function createCategory(overrides: Partial<CategoryData> = {}): CategoryData {
	return {
		name: faker.commerce.department(),
		type: faker.helpers.arrayElement(["expense", "income"]) as "expense" | "income",
		icon: "default.svg",
		...overrides,
	};
}

interface CategoryData {
	name: string;
	type: "expense" | "income";
	icon: string;
}

/**
 * Factory for creating transaction test data
 */
export function createTransaction(
	overrides: Partial<TransactionData> = {},
): TransactionData {
	const type =
		overrides.type ??
		(faker.helpers.arrayElement(["expense", "income"]) as TransactionType);
	const cents =
		type === "expense"
			? -faker.number.int({ min: 100, max: 50000 })
			: faker.number.int({ min: 100, max: 50000 });

	return {
		description: faker.commerce.productName(),
		cents,
		type,
		date: faker.date.recent({ days: 30 }).toISOString().split("T")[0],
		paid: faker.datatype.boolean(),
		...overrides,
	};
}

type TransactionType = "expense" | "income";

interface TransactionData {
	description: string;
	cents: number;
	type: TransactionType;
	date: string;
	paid: boolean;
	walletId?: number;
	categoryId?: number;
}

/**
 * Factory for creating subscription test data
 */
export function createSubscription(
	overrides: Partial<SubscriptionData> = {},
): SubscriptionData {
	return {
		name: faker.company.name() + " Subscription",
		cents: -faker.number.int({ min: 500, max: 10000 }),
		dayOfMonth: faker.number.int({ min: 1, max: 28 }),
		startDate: faker.date.past({ years: 1 }).toISOString().split("T")[0],
		...overrides,
	};
}

interface SubscriptionData {
	name: string;
	cents: number;
	dayOfMonth: number;
	startDate: string;
	walletId?: number;
	categoryId?: number;
}

/**
 * Generate a unique name with timestamp to avoid collisions
 */
export function uniqueName(prefix: string): string {
	return `${prefix} ${Date.now()}`;
}

/**
 * Generate test amount in cents
 */
export function randomCents(min = 100, max = 50000): number {
	return faker.number.int({ min, max });
}

/**
 * Generate a date string in YYYY-MM-DD format
 */
export function randomDate(options?: { days?: number; past?: boolean }): string {
	const days = options?.days ?? 30;
	const date =
		options?.past !== false ? faker.date.recent({ days }) : faker.date.soon({ days });
	return date.toISOString().split("T")[0];
}

/**
 * Generate current month's date
 */
export function currentMonthDate(): string {
	const now = new Date();
	const day = faker.number.int({ min: 1, max: now.getDate() });
	return new Date(now.getFullYear(), now.getMonth(), day).toISOString().split("T")[0];
}
