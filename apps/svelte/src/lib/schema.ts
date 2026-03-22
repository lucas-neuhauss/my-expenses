import { Schema as S, SchemaTransformation } from "effect";
import { z } from "zod";

export const NonNegativeIntFromStringEffectSchema = S.Union([S.String, S.Number]).pipe(
	S.decodeTo(
		S.Number.pipe(S.check(S.isGreaterThanOrEqualTo(0))),
		SchemaTransformation.transform({
			decode: (input: string | number) => Number(input),
			encode: (num: number): string | number => String(num),
		}),
	),
);

export const NonNegativeIntFromString = z
	.string()
	.transform((str) => Number(str))
	.pipe(z.number().nonnegative());
