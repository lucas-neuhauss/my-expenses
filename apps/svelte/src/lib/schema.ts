import { Schema as S } from "effect";
import { z } from "zod";

export const NonNegativeIntFromStringEffectSchema = S.transform(
	S.Union(S.String, S.Number),
	S.NonNegativeInt,
	{
		strict: true,
		decode: (str) => Number(str),
		encode: (num) => String(num),
	},
);

export const NonNegativeIntFromString = z
	.string()
	.transform((str) => Number(str))
	.pipe(z.number().nonnegative());
