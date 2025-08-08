import { CATEGORY_SPECIAL } from "$lib/categories";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import type { UserId } from "$lib/types";
import { DateStringSchema } from "$lib/utils/date-time";
import { and, desc, eq, gte, inArray, isNotNull, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const BooleanStringSchema = z.enum(["true", "false"]).transform((v) => v === "true");

export const upsertTransaction = async ({
	userId,
	shouldContinue,
	formData,
}: {
	userId: UserId;
	shouldContinue: boolean;
	formData: FormData;
}) => {
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
				type: z.enum(["expense", "income"]),
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
		})
		.transform((obj) => ({
			...obj,
			cents: obj.type === "expense" ? -obj.cents : obj.cents,
		}));

	const formValues = formSchema.parse(formObj);
	const { id, wallet: walletId, cents, date, description, paid } = formValues;

	if (id === "new") {
		if (formValues.type === "transference") {
			const specialCategories = await db
				.select({
					id: table.category.id,
					unique: table.category.unique,
				})
				.from(table.category)
				.where(and(eq(table.category.userId, userId), isNotNull(table.category.unique)));
			const categoryTransactionIn = specialCategories.find(
				(c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_IN,
			)!.id;
			const categoryTransactionOut = specialCategories.find(
				(c) => c.unique === CATEGORY_SPECIAL.TRANSFERENCE_OUT,
			)!.id;

			// Create in and out transactions
			const transferenceId = uuidv4();
			await db.insert(table.transaction).values([
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
			]);
		} else {
			// Create normal transaction
			await db.insert(table.transaction).values({
				type: formValues.type,
				date,
				userId,
				categoryId: formValues.category,
				walletId,
				cents,
				paid,
				description,
			});
		}
	} else {
		if (formValues.type === "transference") {
			// Find one of the transactions
			const foundTransaction = await db.query.transaction.findFirst({
				where: eq(table.transaction.id, id),
			});

			if (!foundTransaction || !foundTransaction.transferenceId) {
				throw new Error("Transaction not found");
			}

			const transactions = await db.query.transaction.findMany({
				where: eq(table.transaction.transferenceId, foundTransaction.transferenceId),
			});
			const expense = transactions.find((t) => t.type === "expense");
			const income = transactions.find((t) => t.type === "income");

			if (!expense || !income) {
				throw new Error("Transaction not found");
			}

			// Update expense transaction
			await db
				.update(table.transaction)
				.set({
					date,
					walletId: walletId,
					cents: -cents,
					paid,
					description,
				})
				.where(eq(table.transaction.id, expense.id));

			// Update income transaction
			await db
				.update(table.transaction)
				.set({
					date,
					walletId: formValues.toWallet,
					cents,
					paid,
					description,
				})
				.where(eq(table.transaction.id, income.id));
		} else {
			// update normal transaction
			await db
				.update(table.transaction)
				.set({
					date,
					categoryId: formValues.category,
					walletId,
					cents,
					paid,
					description,
				})
				.where(eq(table.transaction.id, id));
		}
	}

	return {
		ok: true,
		shouldContinue,
		toast: id === "new" ? "Transaction created" : "Transaction updated",
	};
};

export const deleteTransaction = async ({
	userId,
	transactionId,
}: {
	userId: UserId;
	transactionId: number;
}) => {
	// Get the transaction to be deleted. Make sure to check if the `userId` matches
	const [transaction] = await db
		.select()
		.from(table.transaction)
		.where(
			and(eq(table.transaction.id, transactionId), eq(table.transaction.userId, userId)),
		);
	if (!transaction) {
		throw new Error("Transaction not found");
	}

	if (transaction.transferenceId !== null) {
		const transactions = await db.query.transaction.findMany({
			where: (table, { eq }) => eq(table.transferenceId, transaction.transferenceId!),
		});
		if (transactions.length !== 2) {
			throw new Error("Transactions from transference not found");
		}
		await db.delete(table.transaction).where(
			inArray(
				table.transaction.id,
				transactions.map((t) => t.id),
			),
		);
	} else {
		await db.delete(table.transaction).where(eq(table.transaction.id, transactionId));
	}

	return { ok: true, toast: "Transaction deleted" };
};

export const getDashboardTransactions = async ({
	userId,
	start,
	end,
}: {
	userId: UserId;
	start: string;
	end: string;
}) => {
	const tableCategoryParent = alias(table.category, "parent");
	const tableTransactionFrom = alias(table.transaction, "from");
	const tableTransactionTo = alias(table.transaction, "to");

	return db
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
		.orderBy(desc(table.transaction.date), desc(table.transaction.id));
};

export type DashboardTransaction = Awaited<
	ReturnType<typeof getDashboardTransactions>
>[number];
