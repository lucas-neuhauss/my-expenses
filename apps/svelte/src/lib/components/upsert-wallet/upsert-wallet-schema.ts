import { NonNegativeIntFromString } from "$lib/schema";
import * as z from "zod";

export const UpsertWalletSchema = z.object({
	id: NonNegativeIntFromString,
	name: z.string().min(2).max(50),
	initialBalance: NonNegativeIntFromString,
});

export type UpsertWalletSchema = z.infer<typeof UpsertWalletSchema>;
