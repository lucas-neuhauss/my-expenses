import { describe, expect, it } from "vitest";
import { hasDecimalPart, parseAmountToCents } from "./amount";

describe("parseAmountToCents", () => {
	it("parses whole numbers", () => {
		expect(parseAmountToCents("25")).toBe(2500);
		expect(parseAmountToCents("0")).toBe(0);
	});

	it("parses decimals with a dot or a comma", () => {
		expect(parseAmountToCents("25.50")).toBe(2550);
		expect(parseAmountToCents("25,50")).toBe(2550);
		expect(parseAmountToCents("0.99")).toBe(99);
	});

	it("trims surrounding whitespace", () => {
		expect(parseAmountToCents(" 25.50 ")).toBe(2550);
	});

	it("returns null for empty or whitespace-only input", () => {
		expect(parseAmountToCents("")).toBeNull();
		expect(parseAmountToCents("   ")).toBeNull();
	});

	it("ignores the sign so amounts match on magnitude", () => {
		expect(parseAmountToCents("-5")).toBe(500);
		expect(parseAmountToCents("-25.50")).toBe(2550);
	});

	it("returns null for non-numeric input", () => {
		expect(parseAmountToCents("abc")).toBeNull();
		expect(parseAmountToCents("1.2.3")).toBeNull();
	});

	it("avoids floating-point drift for common currency values", () => {
		expect(parseAmountToCents("19.99")).toBe(1999);
		expect(parseAmountToCents("0.1")).toBe(10);
	});
});

describe("hasDecimalPart", () => {
	it("detects a decimal separator", () => {
		expect(hasDecimalPart("25.50")).toBe(true);
		expect(hasDecimalPart("25,50")).toBe(true);
		expect(hasDecimalPart("25.")).toBe(true);
		expect(hasDecimalPart(" 25.5 ")).toBe(true);
	});

	it("returns false for whole numbers", () => {
		expect(hasDecimalPart("25")).toBe(false);
		expect(hasDecimalPart(" 25 ")).toBe(false);
	});
});
