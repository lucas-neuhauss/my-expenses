import { Schema as S } from "effect";

const NonNegativeIntFromString = S.transform(
	S.Union(S.String, S.Number),
	S.NonNegativeInt,
	{
		strict: true,
		decode: (str) => Number(str),
		encode: (num) => String(num),
	},
);

export const UpsertWalletSchema = S.Struct({
	id: NonNegativeIntFromString,
	name: S.NonEmptyString.pipe(S.maxLength(50)),
	initialBalance: NonNegativeIntFromString,
});

export type UpsertWalletSchema = S.Schema.Type<typeof UpsertWalletSchema>;
