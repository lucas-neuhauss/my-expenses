import { NonNegativeIntFromString } from "$lib/schema";
import { Schema as S } from "effect";

export const UpsertWalletSchema = S.Struct({
	id: NonNegativeIntFromString,
	name: S.NonEmptyString.pipe(S.maxLength(50)),
	initialBalance: NonNegativeIntFromString,
});

export type UpsertWalletSchema = S.Schema.Type<typeof UpsertWalletSchema>;
