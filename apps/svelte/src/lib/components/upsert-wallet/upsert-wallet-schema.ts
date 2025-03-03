import { z } from "zod";

export const upsertWalletSchema = z.object({
	id: z.coerce.number().int().positive().optional(),
	name: z.string().min(1).max(50),
	initialBalance: z.coerce.number().optional(),
});

export type UpsertWalletSchema = typeof upsertWalletSchema;
