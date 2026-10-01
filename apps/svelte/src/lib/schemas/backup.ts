import { CATEGORY_ICON_LIST } from "$lib/categories";
import { z } from "zod";

const id = z.number().int().positive().max(2147483647);
const cents = z.number().int().min(-2147483648).max(2147483647);
const name = z.string().min(1).max(255);
const type = z.enum(["expense", "income"]);
const date = z.iso.date();
const nullableId = id.nullable().default(null);
// Older exports contain PostgreSQL timestamp-without-time-zone text.
const timestamp = z
	.string()
	.transform((value) =>
		/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
			? value.replace(" ", "T") + "Z"
			: value,
	)
	.pipe(z.iso.datetime({ offset: true }));

/** The snake-case wire format also accepts backups predating subscriptions/installments. */
export const BackupSchema = z
	.object({
		version: z.literal(1).optional(),
		wallet: z.array(
			z.object({
				id,
				name,
				initial_balance: cents,
			}),
		),
		category: z.array(
			z.object({
				id,
				name,
				type,
				icon: z.enum(CATEGORY_ICON_LIST),
				parent_id: nullableId,
				unique: z.enum(["transference_in", "transference_out"]).nullable().default(null),
			}),
		),
		subscription: z
			.array(
				z.object({
					id,
					name,
					cents,
					category_id: id,
					wallet_id: id,
					day_of_month: z.number().int().min(1).max(31),
					paused: z.boolean(),
					start_date: date,
					end_date: date.nullable(),
					last_generated: date.nullable(),
				}),
			)
			.default([]),
		transaction: z.array(
			z.object({
				id,
				cents,
				type,
				description: z.string().nullable(),
				category_id: id,
				wallet_id: id,
				transference_id: z.string().nullable(),
				date,
				paid: z.boolean(),
				created_at: timestamp,
				updated_at: timestamp,
				installment_group_id: z.string().nullable().default(null),
				installment_index: z.number().int().min(1).max(24).nullable().default(null),
				installment_total: z.number().int().min(2).max(24).nullable().default(null),
				subscription_id: nullableId,
			}),
		),
	})
	.superRefine((data, ctx) => {
		const invalid = (message: string) => ctx.addIssue({ code: "custom", message });
		for (const key of ["wallet", "category", "subscription", "transaction"] as const) {
			const ids = data[key].map((row) => row.id);
			if (new Set(ids).size !== ids.length) invalid(`Duplicate ${key} IDs`);
		}
		const wallets = new Set(data.wallet.map((row) => row.id));
		const categories = new Map(data.category.map((row) => [row.id, row]));
		const subscriptions = new Set(data.subscription.map((row) => row.id));
		const specials = data.category.flatMap((row) => (row.unique ? [row.unique] : []));
		if (new Set(specials).size !== specials.length)
			invalid("Duplicate transfer categories");
		for (const row of data.category) {
			if (row.parent_id !== null) {
				const parent = categories.get(row.parent_id);
				if (!parent || parent.parent_id !== null || parent.type !== row.type) {
					invalid("Invalid category parent");
				}
			}
		}
		for (const row of [...data.subscription, ...data.transaction]) {
			if (!wallets.has(row.wallet_id) || !categories.has(row.category_id)) {
				invalid("Missing wallet or category reference");
			}
		}
		for (const row of data.subscription) {
			if (row.end_date !== null && row.end_date < row.start_date)
				invalid("Invalid subscription date range");
		}
		for (const row of data.transaction) {
			if (row.subscription_id !== null && !subscriptions.has(row.subscription_id)) {
				invalid("Missing subscription reference");
			}
			if (row.installment_group_id !== null) {
				if (
					row.installment_index === null ||
					row.installment_total === null ||
					row.installment_index > row.installment_total
				) {
					invalid("Invalid installment metadata");
				}
			} else if (row.installment_index !== null || row.installment_total !== null) {
				invalid("Installment metadata requires a group");
			}
		}
	});

export type BackupData = z.infer<typeof BackupSchema>;
