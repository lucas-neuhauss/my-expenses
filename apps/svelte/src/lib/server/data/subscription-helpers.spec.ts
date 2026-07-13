import { describe, expect, it } from "vitest";
import {
	addMonths,
	formatDateString,
	getDateWithDay,
	parseDate,
	splitEqually,
} from "./subscription-helpers";

describe("splitEqually", () => {
	it("splits 100 cents into 3 parts with remainder distributed", () => {
		expect(splitEqually(100, 3)).toEqual([34, 33, 33]);
	});

	it("splits exactly divisible amounts evenly", () => {
		expect(splitEqually(100, 4)).toEqual([25, 25, 25, 25]);
	});

	it("returns single part for count of 1", () => {
		expect(splitEqually(100, 1)).toEqual([100]);
	});

	it("handles zero cents", () => {
		expect(splitEqually(0, 5)).toEqual([0, 0, 0, 0, 0]);
	});

	it("distributes remainder to first parts", () => {
		expect(splitEqually(10, 4)).toEqual([3, 3, 2, 2]);
	});

	it("handles large numbers", () => {
		const result = splitEqually(100000, 3);
		expect(result).toHaveLength(3);
		expect(result.reduce((a, b) => a + b, 0)).toBe(100000);
	});

	it("handles count of 0 (empty array)", () => {
		expect(splitEqually(100, 0)).toEqual([]);
	});
});

describe("addMonths", () => {
	it("adds months without year overflow", () => {
		expect(addMonths("2024-01-15", 2)).toBe("2024-03-15");
	});

	it("handles year overflow", () => {
		expect(addMonths("2024-11-15", 3)).toBe("2025-02-15");
	});

	it("clamps day for short month (leap year February)", () => {
		expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
	});

	it("clamps day for non-leap year February", () => {
		expect(addMonths("2023-01-31", 1)).toBe("2023-02-28");
	});

	it("clamps day when going into April (30 days) from March (31)", () => {
		expect(addMonths("2024-03-31", 1)).toBe("2024-04-30");
	});

	it("preserves day when target month has enough days", () => {
		expect(addMonths("2024-05-15", 1)).toBe("2024-06-15");
	});

	it("adds zero months returns same date", () => {
		expect(addMonths("2024-06-15", 0)).toBe("2024-06-15");
	});

	it("handles multiple year overflows", () => {
		expect(addMonths("2024-01-15", 24)).toBe("2026-01-15");
	});
});

describe("getDateWithDay", () => {
	it("handles month overflow (December = month 11, day 31)", () => {
		const result = getDateWithDay(2024, 11, 31);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(11); // December
		expect(result.getDate()).toBe(31);
	});

	it("clamps day to month maximum (Feb in leap year)", () => {
		const result = getDateWithDay(2024, 1, 31);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(1); // February
		expect(result.getDate()).toBe(29);
	});

	it("clamps day to month maximum (Feb in non-leap year)", () => {
		const result = getDateWithDay(2023, 1, 31);
		expect(result.getFullYear()).toBe(2023);
		expect(result.getMonth()).toBe(1); // February
		expect(result.getDate()).toBe(28);
	});

	it("returns exact day for months with enough days", () => {
		const result = getDateWithDay(2024, 0, 15); // January
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(15);
	});

	it("handles year overflow when month > 11", () => {
		const result = getDateWithDay(2024, 12, 15); // month 12 = January of next year
		expect(result.getFullYear()).toBe(2025);
		expect(result.getMonth()).toBe(0); // January
		expect(result.getDate()).toBe(15);
	});

	it("handles multiple year overflows", () => {
		const result = getDateWithDay(2024, 24, 15); // month 24 = January of 2026
		expect(result.getFullYear()).toBe(2026);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(15);
	});
});

describe("parseDate", () => {
	it("parses a valid YYYY-MM-DD string", () => {
		const result = parseDate("2024-03-15");
		expect(result).toBeInstanceOf(Date);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(2); // March
		expect(result.getDate()).toBe(15);
	});

	it("parses start of year", () => {
		const result = parseDate("2024-01-01");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(1);
	});

	it("parses end of year", () => {
		const result = parseDate("2024-12-31");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(11);
		expect(result.getDate()).toBe(31);
	});

	it("parses leap year date", () => {
		const result = parseDate("2024-02-29");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(1);
		expect(result.getDate()).toBe(29);
	});

	it("parses early year date", () => {
		const result = parseDate("2020-01-01");
		expect(result.getFullYear()).toBe(2020);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(1);
	});
});

describe("formatDateString", () => {
	it("formats a Date to YYYY-MM-DD", () => {
		const date = new Date(2024, 2, 15); // March 15, 2024
		expect(formatDateString(date)).toBe("2024-03-15");
	});

	it("formats January date correctly", () => {
		const date = new Date(2024, 0, 1);
		expect(formatDateString(date)).toBe("2024-01-01");
	});

	it("formats December date correctly", () => {
		const date = new Date(2024, 11, 31);
		expect(formatDateString(date)).toBe("2024-12-31");
	});

	it("pads single-digit month and day", () => {
		const date = new Date(2024, 0, 5);
		expect(formatDateString(date)).toBe("2024-01-05");
	});

	it("formats date with two-digit month and day", () => {
		const date = new Date(2024, 9, 10); // October
		expect(formatDateString(date)).toBe("2024-10-10");
	});
});
