import { CATEGORY_SPECIAL } from "$lib/categories";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { DateStringSchema } from "$lib/utils/date-time";
import { and, desc, eq, gte, inArray, isNotNull, lte, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

export const upsertTransaction = async ({
	userId,
	formData,
}: {
	userId: number;
	formData: FormData;
}) => {
	const formObj = Object.fromEntries(formData.entries());
	const baseSchema = z.object({
		id: z.coerce.number().int().or(z.literal("new")),
		wallet: z.coerce.number().int(),
		cents: z.coerce
			.number()
			.gt(0)
			.transform((v) => Math.round(v * 100)),
		date: DateStringSchema, // TODO: Check if valid date string
		description: z.string().min(1).trim().nullable().catch(null),
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
					code: z.ZodIssueCode.custom,
					message: "Cannot transfer to the same wallet",
				});
			}
		})
		.transform((obj) => ({
			...obj,
			cents: obj.type === "expense" ? -obj.cents : obj.cents,
		}));

	const formValues = formSchema.parse(formObj);
	const { id, wallet: walletId, cents, date, description } = formValues;

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
			const [{ id: transactionOutId }, { id: transactionInId }] = await db
				.insert(table.transaction)
				.values([
					{
						type: "expense",
						date,
						userId,
						categoryId: categoryTransactionOut,
						walletId: walletId,
						isTransference: true,
						cents: -cents,
						description,
					},
					{
						type: "income",
						date,
						userId,
						categoryId: categoryTransactionIn,
						walletId: formValues.toWallet,
						isTransference: true,
						cents,
						description,
					},
				])
				.returning({ id: table.transaction.id });

			// Create transference
			await db.insert(table.transference).values({
				transactionOutId,
				transactionInId,
			});
		} else {
			// Create normal transaction
			await db.insert(table.transaction).values({
				type: formValues.type,
				date,
				userId,
				categoryId: formValues.category,
				walletId,
				cents,
				description,
			});
		}
	} else {
		if (formValues.type === "transference") {
			const foundTransference = await db.query.transference.findFirst({
				where: or(
					eq(table.transference.transactionOutId, id),
					eq(table.transference.transactionInId, id),
				),
			});

			if (!foundTransference) {
				throw new Error("Transference not found");
			}

			// Update expense transaction
			await db
				.update(table.transaction)
				.set({
					date,
					walletId: walletId,
					cents: -cents,
					description,
				})
				.where(eq(table.transaction.id, foundTransference.transactionOutId));

			// Update income transaction
			await db
				.update(table.transaction)
				.set({
					date,
					walletId: formValues.toWallet,
					cents,
					description,
				})
				.where(eq(table.transaction.id, foundTransference.transactionInId));
		} else {
			// update normal transaction
			await db
				.update(table.transaction)
				.set({
					date,
					categoryId: formValues.category,
					walletId,
					cents,
					description,
				})
				.where(eq(table.transaction.id, id));
		}
	}

	return { ok: true };
};

export const deleteTransaction = async ({
	userId,
	transactionId,
}: {
	userId: number;
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

	if (transaction.isTransference) {
		const [transference] = await db
			.select()
			.from(table.transference)
			.where(
				or(
					eq(table.transference.transactionOutId, transactionId),
					eq(table.transference.transactionInId, transactionId),
				),
			);

		await db.delete(table.transference).where(eq(table.transference.id, transference.id));
		await db
			.delete(table.transaction)
			.where(
				inArray(table.transaction.id, [
					transference.transactionOutId,
					transference.transactionInId,
				]),
			);
	} else {
		await db.delete(table.transaction).where(eq(table.transaction.id, transactionId));
	}

	return { ok: true };
};

export const getDashboardTransactions = async ({
	userId,
	wallet,
	start,
	end,
}: {
	userId: number;
	wallet: number;
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
			isTransference: table.transaction.isTransference,
			wallet: {
				id: table.wallet.id,
				name: table.wallet.name,
			},
			category: {
				id: table.category.id,
				name: table.category.name,
				iconName: table.category.iconName,
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
				// category === -1 ? undefined : inArray(table.transaction.categoryId, categoryIds),
				wallet === -1 ? undefined : eq(table.transaction.walletId, wallet),
			),
		)
		.innerJoin(table.category, eq(table.transaction.categoryId, table.category.id))
		.innerJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
		.leftJoin(tableCategoryParent, eq(table.category.parentId, tableCategoryParent.id))
		.leftJoin(
			table.transference,
			or(
				eq(table.transaction.id, table.transference.transactionOutId),
				eq(table.transaction.id, table.transference.transactionInId),
			),
		)
		.leftJoin(
			tableTransactionFrom,
			eq(table.transference.transactionOutId, tableTransactionFrom.id),
		)
		.leftJoin(
			tableTransactionTo,
			eq(table.transference.transactionInId, tableTransactionTo.id),
		)
		.orderBy(desc(table.transaction.date), desc(table.transaction.id));
};

export type DashboardTransaction = Awaited<
	ReturnType<typeof getDashboardTransactions>
>[number];
