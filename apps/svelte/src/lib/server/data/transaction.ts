import { CATEGORY_SPECIAL } from "$lib/categories";
import { db, exec } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { DateStringSchema } from "$lib/utils/date-time";
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect } from "effect";
import { v4 as uuidv4 } from "uuid";
import * as z from "zod";

const BooleanStringSchema = z.enum(["true", "false"]).transform((v) => v === "true");

/**
 * Split a total amount in cents as equally as possible into N parts.
 * Distributes remainder among first parts to ensure sum equals total.
 */
function splitEqually(totalCents: number, count: number): number[] {
	const base = Math.floor(totalCents / count);
	const remainder = totalCents % count;
	return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/**
 * Add N months to a date string (YYYY-MM-DD).
 * Clamps to last day of month if original day doesn't exist (Jan 31 + 1mo → Feb 28/29).
 */
function addMonths(dateStr: string, months: number): string {
	const [year, month, day] = dateStr.split("-").map(Number);
	let newYear = year;
	let newMonth = month + months;

	// Handle year overflow
	while (newMonth > 12) {
		newMonth -= 12;
		newYear++;
	}

	// Get last day of target month
	const lastDay = new Date(newYear, newMonth, 0).getDate();
	const clampedDay = Math.min(day, lastDay);

	return `${newYear}-${String(newMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

export const upsertTransactionData = Effect.fn("data/transaction/upsertTransactionData")(
	function* ({
		userId,
		shouldContinue,
		formData,
	}: {
		userId: UserId;
		shouldContinue: boolean;
		formData: FormData;
	}) {
		const formObj = Object.fromEntries(formData.entries());
		const baseSchema = z.object({
			id: z.coerce.number().int().or(z.literal("new")),
			wallet: z.coerce.number().int(),
			cents: z.coerce
				.number()
				.gte(0)
				.transform((v) => Math.round(v * 100)),
			date: DateStringSchema,
			description: z.string().min(1).trim().nullable().catch(null),
			paid: BooleanStringSchema,
		});
		const formSchema = z
			.discriminatedUnion("type", [
				baseSchema.extend({
					type: z.literal("expense"),
					category: z.coerce.number().int().positive(),
					installmentsEnabled: BooleanStringSchema.optional().default(false),
					installmentsCount: z.coerce.number().int().min(2).max(24).optional(),
					installmentsCents: z.string().optional(),
				}),
				baseSchema.extend({
					type: z.literal("income"),
					category: z.coerce.number().int().positive(),
				}),
				baseSchema.extend({
					type: z.literal("transference"),
					toWallet: z.coerce.number().int(),
				}),
			])
			.superRefine((obj, ctx) => {
				if (obj.type === "transference" && obj.wallet === obj.toWallet) {
					ctx.addIssue({
						code: "custom",
						message: "Cannot transfer to the same wallet",
					});
				}
				// Validate installments for expenses
				if (obj.type === "expense" && obj.installmentsEnabled) {
					if (!obj.installmentsCount || obj.installmentsCount < 2) {
						ctx.addIssue({
							code: "custom",
							message: "Installments count must be at least 2",
							path: ["installmentsCount"],
						});
						return;
					}
					if (obj.installmentsCents) {
						try {
							const cents = JSON.parse(obj.installmentsCents) as number[];
							if (cents.length !== obj.installmentsCount) {
								ctx.addIssue({
									code: "custom",
									message: "Installment cents array length must match count",
									path: ["installmentsCents"],
								});
								return;
							}
							const sum = cents.reduce((a, b) => a + b, 0);
							if (sum !== obj.cents) {
								ctx.addIssue({
									code: "custom",
									message: `Installment sum (${sum}) must equal total (${obj.cents})`,
									path: ["installmentsCents"],
								});
							}
						} catch {
							ctx.addIssue({
								code: "custom",
								message: "Invalid installmentsCents JSON",
								path: ["installmentsCents"],
							});
						}
					}
				}
			})
			.transform((obj) => {
				const base = {
					...obj,
					cents: obj.type === "expense" ? -obj.cents : obj.cents,
				};
				// Parse installmentsCents if present
				if (obj.type === "expense" && obj.installmentsEnabled && obj.installmentsCents) {
					return {
						...base,
						parsedInstallmentsCents: JSON.parse(obj.installmentsCents) as number[],
					};
				}
				return { ...base, parsedInstallmentsCents: undefined };
			});

		const formValues = formSchema.parse(formObj);
		const { id, wallet: walletId, cents, date, description, paid } = formValues;

		if (id === "new") {
			if (formValues.type === "transference") {
				const specialCategories = yield* exec(
					db
						.select({
							id: table.category.id,
							unique: table.category.unique,
						})
						.from(table.category)
						.where(
							and(eq(table.category.userId, userId), isNotNull(table.category.unique)),
						),
				);
				const categoryTransactionIn = specialCategories.find(
					(c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_IN,
				)!.id;
				const categoryTransactionOut = specialCategories.find(
					(c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_OUT,
				)!.id;

				// Create in and out transactions
				const transferenceId = uuidv4();
				yield* exec(
					db.insert(table.transaction).values([
						{
							type: "expense",
							date,
							userId,
							categoryId: categoryTransactionOut,
							walletId: walletId,
							transferenceId,
							cents: -cents,
							paid,
							description,
						},
						{
							type: "income",
							date,
							userId,
							categoryId: categoryTransactionIn,
							walletId: formValues.toWallet,
							transferenceId,
							cents,
							paid,
							description,
						},
					]),
				);
			} else if (
				formValues.type === "expense" &&
				formValues.installmentsEnabled &&
				formValues.installmentsCount
			) {
				// Create installment transactions
				const count = formValues.installmentsCount;
				const installmentCents =
					formValues.parsedInstallmentsCents ?? splitEqually(Math.abs(cents), count);

				const transactions = Array.from({ length: count }, (_, i) => ({
					type: "expense" as const,
					date: addMonths(date, i),
					userId,
					categoryId: formValues.category,
					walletId,
					cents: -installmentCents[i],
					paid,
					description: description
						? `${description} - [${i + 1}/${count}]`
						: `[${i + 1}/${count}]`,
				}));

				yield* exec(db.insert(table.transaction).values(transactions));
			} else {
				// Create normal transaction
				yield* exec(
					db.insert(table.transaction).values({
						type: formValues.type,
						date,
						userId,
						categoryId: formValues.category,
						walletId,
						cents,
						paid,
						description,
					}),
				);
			}
		} else {
			if (formValues.type === "transference") {
				// Find one of the transactions
				const foundTransaction = yield* exec(
					db.query.transaction.findFirst({
						where: eq(table.transaction.id, id),
					}),
				);

				if (!foundTransaction || !foundTransaction.transferenceId) {
					throw new Error("Transaction not found");
				}

				const transactions = yield* exec(
					db.query.transaction.findMany({
						where: eq(table.transaction.transferenceId, foundTransaction.transferenceId),
					}),
				);
				const expense = transactions.find((t) => t.type === "expense");
				const income = transactions.find((t) => t.type === "income");

				if (!expense || !income) {
					throw new Error("Transaction not found");
				}

				// Update expense transaction
				yield* exec(
					db
						.update(table.transaction)
						.set({
							date,
							walletId: walletId,
							cents: -cents,
							paid,
							description,
						})
						.where(eq(table.transaction.id, expense.id)),
				);

				// Update income transaction
				yield* exec(
					db
						.update(table.transaction)
						.set({
							date,
							walletId: formValues.toWallet,
							cents,
							paid,
							description,
						})
						.where(eq(table.transaction.id, income.id)),
				);
			} else {
				// update normal transaction
				yield* exec(
					db
						.update(table.transaction)
						.set({
							date,
							categoryId: formValues.category,
							walletId,
							cents,
							paid,
							description,
						})
						.where(eq(table.transaction.id, id)),
				);
			}
		}

		return {
			ok: true,
			shouldContinue,
			toast: id === "new" ? "Transaction created" : "Transaction updated",
		};
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
			throw new Error("Transaction not found");
		}

		if (transaction.transferenceId !== null) {
			const transactions = yield* exec(
				db.query.transaction.findMany({
					where: (table, { eq }) => eq(table.transferenceId, transaction.transferenceId!),
				}),
			);
			if (transactions.length !== 2) {
				throw new Error("Transactions from transference not found");
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

		return { ok: true, toast: "Transaction deleted" };
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

export type DashboardTransaction = Effect.Effect.Success<
	ReturnType<typeof getDashboardTransactionsData>
>[number];
