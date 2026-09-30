/**
 * Pure planner for transaction writes.
 *
 * Internal seam of the transaction intake module: it turns a decoded
 * `Transaction` into the concrete rows to write, with no database access.
 * `upsertTransactionData` supplies the server-generated ids and the
 * transference category lookup, then applies the plan. Tests exercise this
 * module directly, so the transference / installment / sign rules are
 * covered without a database.
 */
import type { Transaction } from "$lib/schemas/transaction";
import { addMonths, splitEqually } from "./subscription-helpers";

/**
 * One transaction row the planner wants persisted. Mirrors the Drizzle
 * columns the intake module writes; `userId` is added at persistence time
 * because the planner is user-agnostic.
 */
export type PlannedTransactionRow = {
	type: "expense" | "income";
	date: string;
	cents: number;
	paid: boolean;
	description: string | null;
	walletId: number;
	categoryId: number;
	transferenceId: string | null;
	installmentGroupId: string | null;
	installmentIndex: number | null;
	installmentTotal: number | null;
};

/** The two special category ids a transference leg must reference. */
export type TransferenceCategories = { in: number; out: number };

export type PlannedTransactionUpdate = {
	date: string;
	cents: number;
	paid: boolean;
	description: string | null;
	walletId: number;
	categoryId?: number;
};

/**
 * Plan the rows for creating a transaction.
 *
 * - transference → an expense leg and an income leg sharing `transferenceId`
 * - expense with installments → `installmentsCount` rows, one per month,
 *   with `installmentsCents` (or an equal split of `cents`) and `paid`
 *   only for installments already due
 * - otherwise → the single row
 *
 * `today` is injected rather than read from the clock so the installment
 * `paid` rule is testable. Only `userId`, `transferenceId` and
 * `installmentGroupId` are added by the caller.
 */
export function planCreateRows(args: {
	transaction: Transaction;
	transferenceCategories: TransferenceCategories;
	transferenceId: string;
	installmentGroupId: string;
	today: string;
}): PlannedTransactionRow[] {
	const {
		transaction: t,
		transferenceCategories,
		transferenceId,
		installmentGroupId,
		today,
	} = args;

	if (t.type === "transference") {
		const base = {
			date: t.date,
			paid: t.paid,
			description: t.description,
			transferenceId,
			installmentGroupId: null,
			installmentIndex: null,
			installmentTotal: null,
		};
		return [
			{
				...base,
				type: "expense",
				cents: -t.cents,
				walletId: t.wallet,
				categoryId: transferenceCategories.out,
			},
			{
				...base,
				type: "income",
				cents: t.cents,
				walletId: t.toWallet!,
				categoryId: transferenceCategories.in,
			},
		];
	}

	if (t.type === "expense" && t.installmentsEnabled && t.installmentsCount) {
		const count = t.installmentsCount;
		const installmentCents = t.installmentsCents
			? (JSON.parse(t.installmentsCents) as number[])
			: splitEqually(t.cents, count);

		return Array.from({ length: count }, (_, i) => {
			const installmentDate = addMonths(t.date, i);
			return {
				type: "expense" as const,
				date: installmentDate,
				cents: -installmentCents[i],
				// Only an installment that is already due can be paid.
				paid: t.paid && installmentDate <= today,
				description: t.description,
				walletId: t.wallet,
				categoryId: t.category!,
				transferenceId: null,
				installmentGroupId,
				installmentIndex: i + 1,
				installmentTotal: count,
			};
		});
	}

	return [
		{
			type: t.type,
			date: t.date,
			cents: t.type === "expense" ? -t.cents : t.cents,
			paid: t.paid,
			description: t.description,
			walletId: t.wallet,
			categoryId: t.category!,
			transferenceId: null,
			installmentGroupId: null,
			installmentIndex: null,
			installmentTotal: null,
		},
	];
}

/** Plan the update of a non-transference transaction. */
export function planSimpleUpdate(t: Transaction): PlannedTransactionUpdate {
	return {
		date: t.date,
		cents: t.type === "expense" ? -t.cents : t.cents,
		paid: t.paid,
		description: t.description,
		walletId: t.wallet,
		categoryId: t.category,
	};
}

/**
 * Plan the update of a transference. Both legs keep their own special
 * category; only the date, amount, paid flag, description and wallet move.
 */
export function planTransferenceUpdate(t: Transaction): {
	expense: PlannedTransactionUpdate;
	income: PlannedTransactionUpdate;
} {
	return {
		expense: {
			date: t.date,
			cents: -t.cents,
			paid: t.paid,
			description: t.description,
			walletId: t.wallet,
		},
		income: {
			date: t.date,
			cents: t.cents,
			paid: t.paid,
			description: t.description,
			walletId: t.toWallet!,
		},
	};
}
