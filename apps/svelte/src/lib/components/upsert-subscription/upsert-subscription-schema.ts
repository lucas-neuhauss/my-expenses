import { NonNegativeIntFromString } from "$lib/schema";
import * as z from "zod";

const CentsFromDollarString = z
	.string()
	.transform((str) => Math.round(Number(str) * 100))
	.pipe(z.number().int());

const PositiveIntFromString = z
	.string()
	.transform((str) => Number(str))
	.pipe(z.number().int().positive());

export const UpsertSubscriptionSchema = z.object({
	id: NonNegativeIntFromString.or(z.literal("new")),
	name: z.string().min(1).max(255),
	cents: CentsFromDollarString,
	categoryId: PositiveIntFromString,
	walletId: PositiveIntFromString,
	dayOfMonth: z
		.string()
		.transform((str) => Number(str))
		.pipe(z.number().int().min(1).max(31)),
	startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	endDate: z
		.string()
		.transform((v) => (v === "" ? null : v))
		.pipe(
			z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.nullable(),
		),
});

export type UpsertSubscriptionSchema = z.infer<typeof UpsertSubscriptionSchema>;
