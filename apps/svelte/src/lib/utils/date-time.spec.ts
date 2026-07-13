import { describe, expect, it } from "vitest";
import { DateStringSchema, getLocalDate, MONTHS } from "./date-time";

describe("DateStringSchema", () => {
	it("accepts any string (no refinement)", () => {
		expect(DateStringSchema.parse("2024-03-15")).toBe("2024-03-15");
		expect(DateStringSchema.parse("not-a-date")).toBe("not-a-date");
		expect(DateStringSchema.parse("")).toBe("");
	});
});

describe("getLocalDate", () => {
	it("parses a valid date string", () => {
		const result = getLocalDate("2024-03-15");
		expect(result).toBeInstanceOf(Date);
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(2); // March is 0-indexed -> 2
		expect(result.getDate()).toBe(15);
	});

	it("handles January (month boundary, month 01 → index 0)", () => {
		const result = getLocalDate("2024-01-01");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(1);
	});

	it("handles December (month 12 → index 11)", () => {
		const result = getLocalDate("2024-12-31");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(11);
		expect(result.getDate()).toBe(31);
	});

	it("throws on invalid date string text", () => {
		expect(() => getLocalDate("not-a-date")).toThrow("Invalid date string");
	});

	it("throws on empty string", () => {
		expect(() => getLocalDate("")).toThrow("Invalid date string");
	});

	it("throws on malformed date string with letters in numbers", () => {
		expect(() => getLocalDate("2024-0a-15")).toThrow("Invalid date string");
	});

	it("parses boundary date values (valid days for month)", () => {
		// Feb 29 in leap year
		const result = getLocalDate("2024-02-29");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(1);
		expect(result.getDate()).toBe(29);
	});

	it("parses date with single-digit month and day", () => {
		const result = getLocalDate("2024-1-5");
		expect(result.getFullYear()).toBe(2024);
		expect(result.getMonth()).toBe(0);
		expect(result.getDate()).toBe(5);
	});

	it("throws on date string with month 0", () => {
		expect(() => getLocalDate("2024-00-15")).toThrow("Invalid date string");
	});

	it("throws on date string with day 0", () => {
		expect(() => getLocalDate("2024-01-00")).toThrow("Invalid date string");
	});
});

describe("MONTHS constant", () => {
	it("includes all 12 months", () => {
		expect(MONTHS).toHaveLength(12);
		expect(MONTHS[0]).toBe("January");
		expect(MONTHS[11]).toBe("December");
	});
});
