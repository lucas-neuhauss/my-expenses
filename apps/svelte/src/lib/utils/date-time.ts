import { z } from "zod";

export const DateStringSchema = z.string();

export const getLocalDate = (dateStr: string) => {
	const values = dateStr.split("-").map(Number);
	const isValid = (value: number) => {
		return z.number().int().gte(1).safeParse(value).success;
	};
	if (values.length === 3 && values.filter(isValid).length === 3) {
		const [year, month, day] = values;

		return new Date(year, month - 1, day);
	} else {
		throw Error("Invalid date string");
	}
};
