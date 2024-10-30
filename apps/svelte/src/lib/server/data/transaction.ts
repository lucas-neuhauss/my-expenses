import { CATEGORY_SPECIAL } from "$lib/categories";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { json } from "@sveltejs/kit";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { z } from "zod";

export const upsertTransaction = async ({
	userId,
	upsertId,
	formData,
}: {
	userId: number;
	upsertId: string;
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
		timestamp: z.coerce.date(),
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

	const formValues = formSchema.parse({ ...formObj, id: upsertId });
	const { id, wallet: walletId, cents, timestamp, description } = formValues;

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
						timestamp,
						userId,
						categoryId: categoryTransactionOut,
						walletId: walletId,
						isTransference: true,
						cents: -cents,
						description,
					},
					{
						type: "income",
						timestamp,
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
				timestamp,
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
					timestamp,
					walletId: walletId,
					cents: -cents,
					description,
				})
				.where(eq(table.transaction.id, foundTransference.transactionOutId));

			// Update income transaction
			await db
				.update(table.transaction)
				.set({
					timestamp,
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
					timestamp,
					categoryId: formValues.category,
					walletId,
					cents,
					description,
				})
				.where(eq(table.transaction.id, id));
		}
	}

	return json({ ok: true });
};
