import type { PieChartDataItem } from "$lib/utils/charts";

/**
 * Default test factory for a wallet-shaped object.
 *
 * Returns a plain object compatible with `Wallet` from the canonical schema.
 * Use overrides to customise specific fields.
 */
export function buildWallet(
	overrides: Partial<{ id: number; name: string; initialBalance: number }> = {},
) {
	return {
		id: overrides.id ?? 1,
		name: overrides.name ?? "Test Wallet",
		initialBalance: overrides.initialBalance ?? 0,
	};
}

export type WalletFactoryOutput = ReturnType<typeof buildWallet>;

/**
 * Default test factory for a category-shaped object suitable for utility
 * functions that consume categories.
 *
 * Returns a plain object with sensible defaults. Use overrides to customise.
 */
export function buildCategory(
	overrides: Partial<{
		id: number;
		name: string;
		type: "income" | "expense";
		icon: string;
		parentId: number | null;
		unique: "transference_in" | "transference_out" | null;
	}> = {},
) {
	return {
		id: overrides.id ?? 1,
		name: overrides.name ?? "Test Category",
		type: overrides.type ?? ("expense" as const),
		icon: overrides.icon ?? "food",
		parentId: overrides.parentId ?? null,
		userId: "test-user-id",
		unique: overrides.unique ?? null,
	};
}

export type CategoryFactoryOutput = ReturnType<typeof buildCategory>;

/**
 * Default test factory for a transaction-shaped object suitable for
 * passing to `calculateDashboardData` and other utility functions.
 *
 * Returns a plain object with sensible defaults. Use overrides to customise.
 */
export function buildTransaction(
	overrides: Partial<{
		id: number;
		type: "income" | "expense";
		cents: number;
		transferenceId: string | null;
		paid: boolean;
		date: string;
		category: { id: number; name: string };
		categoryParent: { id?: number | undefined; name?: string | undefined };
		wallet: { id: number; name: string };
	}> = {},
) {
	return {
		id: overrides.id ?? 1,
		type: overrides.type ?? ("expense" as const),
		cents: overrides.cents ?? 1000,
		transferenceId: overrides.transferenceId ?? null,
		paid: overrides.paid ?? true,
		date: overrides.date ?? "2024-01-15",
		category: overrides.category ?? { id: 1, name: "Food" },
		categoryParent: overrides.categoryParent ?? { id: undefined, name: undefined },
		wallet: overrides.wallet ?? { id: 1, name: "Test Wallet" },
	};
}

export type TransactionFactoryOutput = ReturnType<typeof buildTransaction>;

/**
 * Build an array of items using a factory function.
 *
 * @param factory - The factory function to call for each item.
 * @param count - Number of items to generate.
 * @param overrides - Optional array of per-item overrides, or a single
 *   overrides object applied to all items. If omitted, defaults are used.
 *
 * @example
 * buildList(buildTransaction, 3)
 * buildList(buildTransaction, 2, [{ type: "income" }, { type: "expense" }])
 */
export function buildList<TFactory extends (...args: any[]) => any>(
	factory: TFactory,
	count: number,
	overrides?: Parameters<TFactory>[0][] | Parameters<TFactory>[0],
): ReturnType<TFactory>[] {
	if (Array.isArray(overrides)) {
		return Array.from({ length: count }, (_, i) => factory(overrides[i] ?? {}));
	}
	return Array.from({ length: count }, () => factory(overrides));
}

/**
 * Build a default set of chart data item with sensible defaults.
 */
export function buildPieChartDataItem(
	overrides: Partial<PieChartDataItem> = {},
): PieChartDataItem {
	return {
		id: overrides.id ?? 1,
		name: overrides.name ?? "Category",
		value: overrides.value ?? 1000,
	};
}
