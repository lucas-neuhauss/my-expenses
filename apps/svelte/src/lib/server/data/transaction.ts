import { CATEGORY_SPECIAL } from "$lib/categories";
import { EntityNotFoundError } from "$lib/errors/db";
import type { Transaction } from "$lib/schemas/transaction";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Data, Effect } from "effect";
import { v4 as uuidv4 } from "uuid";
import {
	planCreateRows,
	planSimpleUpdate,
	planTransferenceUpdate,
} from "./transaction-plan";

/**
 * Tagged error for "cannot delete this transaction" conditions.
 * Yielded by `deleteTransactionData` and mapped to HTTP 409 by `statusFor`.
 */
export class DeleteTransactionError extends Data.TaggedError("DeleteTransactionError")<{
	message: string;
}> {}

export const getTransactionsData = Effect.fn("data/transaction/getTransactionsData")(
	function* ({ userId }: { userId: UserId }) {
		const tableTransactionFrom = alias(table.transaction, "from");
		const tableTransactionTo = alias(table.transaction, "to");

		return yield* exec(
			db
				.select({
					id: table.transaction.id,
					cents: table.transaction.cents,
					type: table.transaction.type,
					description: table.transaction.description,
					categoryId: table.transaction.categoryId,
					walletId: table.transaction.walletId,
					transferenceId: table.transaction.transferenceId,
					installmentGroupId: table.transaction.installmentGroupId,
					installmentIndex: table.transaction.installmentIndex,
					installmentTotal: table.transaction.installmentTotal,
					subscriptionId: table.transaction.subscriptionId,
					paid: table.transaction.paid,
					date: table.transaction.date,
					transferenceFrom: {
						id: tableTransactionFrom.id,
						walletId: tableTransactionFrom.walletId,
					},
					transferenceTo: {
						id: tableTransactionTo.id,
						walletId: tableTransactionTo.walletId,
					},
				})
				.from(table.transaction)
				.where(and(eq(table.transaction.userId, userId)))
				.leftJoin(
					tableTransactionFrom,
					and(
						isNotNull(tableTransactionFrom.transferenceId),
						eq(tableTransactionFrom.transferenceId, table.transaction.transferenceId),
						eq(tableTransactionFrom.type, "expense"),
						eq(tableTransactionFrom.userId, userId),
					),
				)
				.leftJoin(
					tableTransactionTo,
					and(
						isNotNull(tableTransactionTo.transferenceId),
						eq(tableTransactionTo.transferenceId, table.transaction.transferenceId),
						eq(tableTransactionTo.type, "income"),
						eq(tableTransactionTo.userId, userId),
					),
				)
				.orderBy(desc(table.transaction.date), desc(table.transaction.id)),
		);
	},
);

export const upsertTransactionData = Effect.fn("data/transaction/upsertTransactionData")(
	function* ({ userId, data }: { userId: UserId; data: Transaction }) {
		if (data.id === "new") {
			let transferenceCategories = { in: 0, out: 0 };
			if (data.type === "transference") {
				transferenceCategories = yield* getTransferenceCategories(userId);
			}

			const rows = planCreateRows({
				transaction: data,
				transferenceCategories,
				transferenceId: uuidv4(),
				installmentGroupId: uuidv4(),
				today: new Date().toISOString().slice(0, 10),
			});

			yield* exec(
				db.insert(table.transaction).values(rows.map((row) => ({ ...row, userId }))),
			);
			return "created" as const;
		}

		// Every write in this module filters by `userId`: the interface
		// promises ownership, so it is enforced here rather than left to
		// the transport.
		const [existing] = yield* exec(
			db
				.select()
				.from(table.transaction)
				.where(
					and(eq(table.transaction.id, data.id), eq(table.transaction.userId, userId)),
				),
		);
		if (!existing) {
			return yield* new EntityNotFoundError({
				entity: "transaction",
				id: data.id,
				where: [`transaction.userId = ${userId}`],
			});
		}

		if (data.type === "transference") {
			const legs = yield* exec(
				db
					.select({
						id: table.transaction.id,
						type: table.transaction.type,
					})
					.from(table.transaction)
					.where(
						and(
							eq(table.transaction.transferenceId, existing.transferenceId!),
							eq(table.transaction.userId, userId),
						),
					),
			);
			const expense = legs.find((leg) => leg.type === "expense");
			const income = legs.find((leg) => leg.type === "income");
			if (!expense || !income) {
				return yield* new EntityNotFoundError({
					entity: "transference",
					id: data.id,
					where: [`transaction.userId = ${userId}`],
				});
			}

			const plan = planTransferenceUpdate(data);
			yield* exec(
				db
					.update(table.transaction)
					.set(plan.expense)
					.where(
						and(
							eq(table.transaction.id, expense.id),
							eq(table.transaction.userId, userId),
						),
					),
			);
			yield* exec(
				db
					.update(table.transaction)
					.set(plan.income)
					.where(
						and(
							eq(table.transaction.id, income.id),
							eq(table.transaction.userId, userId),
						),
					),
			);
		} else {
			yield* exec(
				db
					.update(table.transaction)
					.set(planSimpleUpdate(data))
					.where(
						and(eq(table.transaction.id, data.id), eq(table.transaction.userId, userId)),
					),
			);
		}

		return "updated" as const;
	},
);

/**
 * Look up the two special categories every transference leg references.
 * Fails with `EntityNotFoundError` when the user's categories are missing
 * (e.g. a malformed seed) instead of the previous non-null assertion.
 */
const getTransferenceCategories = Effect.fn("data/transaction/getTransferenceCategories")(
	function* (userId: UserId) {
		const categories = yield* exec(
			db
				.select({
					id: table.category.id,
					unique: table.category.unique,
				})
				.from(table.category)
				.where(and(eq(table.category.userId, userId), isNotNull(table.category.unique))),
		);
		const out = categories.find((c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_OUT);
		const income = categories.find((c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_IN);
		if (!out || !income) {
			return yield* new EntityNotFoundError({
				entity: "transference category",
				id: 0,
				where: [`category.userId = ${userId}`],
			});
		}
		return { out: out.id, in: income.id };
	},
);

export const deleteTransactionData = Effect.fn("data/transaction/deleteTransactionData")(
	function* ({ userId, transactionId }: { userId: UserId; transactionId: number }) {
		// Get the transaction to be deleted. Make sure to check if the `userId` matches
		const [transaction] = yield* exec(
			db
				.select()
				.from(table.transaction)
				.where(
					and(
						eq(table.transaction.id, transactionId),
						eq(table.transaction.userId, userId),
					),
				),
		);
		if (!transaction) {
			return yield* new DeleteTransactionError({
				message: "Transaction not found",
			});
		}

		if (transaction.transferenceId !== null) {
			const transactions = yield* exec(
				db.query.transaction.findMany({
					where: (t, { eq, and }) =>
						and(eq(t.transferenceId, transaction.transferenceId!), eq(t.userId, userId)),
				}),
			);
			if (transactions.length !== 2) {
				return yield* new DeleteTransactionError({
					message: "Linked transfer transactions not found",
				});
			}
			yield* exec(
				db.delete(table.transaction).where(
					inArray(
						table.transaction.id,
						transactions.map((t) => t.id),
					),
				),
			);
		} else {
			yield* exec(
				db.delete(table.transaction).where(eq(table.transaction.id, transactionId)),
			);
		}

		return "Transaction deleted" as const;
	},
);

export const getDashboardTransactionsData = Effect.fn(
	"data/transaction/getDashboardTransactionsData",
)(function* ({ userId, start, end }: { userId: UserId; start: string; end: string }) {
	const tableCategoryParent = alias(table.category, "parent");
	const tableTransactionFrom = alias(table.transaction, "from");
	const tableTransactionTo = alias(table.transaction, "to");

	return yield* exec(
		db
			.select({
				id: table.transaction.id,
				cents: table.transaction.cents,
				type: table.transaction.type,
				description: table.transaction.description,
				date: table.transaction.date,
				transferenceId: table.transaction.transferenceId,
				installmentGroupId: table.transaction.installmentGroupId,
				installmentIndex: table.transaction.installmentIndex,
				installmentTotal: table.transaction.installmentTotal,
				paid: table.transaction.paid,
				wallet: {
					id: table.wallet.id,
					name: table.wallet.name,
				},
				category: {
					id: table.category.id,
					name: table.category.name,
					icon: table.category.icon,
				},
				categoryParent: {
					id: tableCategoryParent.id,
					name: tableCategoryParent.name,
				},
				transferenceFrom: {
					id: tableTransactionFrom.id,
					walletId: tableTransactionFrom.walletId,
				},
				transferenceTo: {
					id: tableTransactionTo.id,
					walletId: tableTransactionTo.walletId,
				},
			})
			.from(table.transaction)
			.where(
				and(
					eq(table.transaction.userId, userId),
					gte(table.transaction.date, start),
					lte(table.transaction.date, end),
				),
			)
			.innerJoin(table.category, eq(table.transaction.categoryId, table.category.id))
			.innerJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
			.leftJoin(tableCategoryParent, eq(table.category.parentId, tableCategoryParent.id))
			.leftJoin(
				tableTransactionFrom,
				and(
					isNotNull(tableTransactionFrom.transferenceId),
					eq(tableTransactionFrom.transferenceId, table.transaction.transferenceId),
					eq(tableTransactionFrom.type, "expense"),
					eq(tableTransactionFrom.userId, userId),
				),
			)
			.leftJoin(
				tableTransactionTo,
				and(
					isNotNull(tableTransactionTo.transferenceId),
					eq(tableTransactionTo.transferenceId, table.transaction.transferenceId),
					eq(tableTransactionTo.type, "income"),
					eq(tableTransactionTo.userId, userId),
				),
			)
			.orderBy(desc(table.transaction.date), desc(table.transaction.id)),
	);
});

export type DashboardTransaction = Effect.Success<
	ReturnType<typeof getDashboardTransactionsData>
>[number];
