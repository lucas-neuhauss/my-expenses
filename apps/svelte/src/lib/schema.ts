import { Schema as S } from "effect";

export const NonNegativeIntFromString = S.transform(
	S.Union(S.String, S.Number),
	S.NonNegativeInt,
	{
		strict: true,
		decode: (str) => Number(str),
		encode: (num) => String(num),
	},
);
