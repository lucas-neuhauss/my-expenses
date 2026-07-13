import { describe, expect, it } from "vitest";
import { getRandomColor } from "./color";

describe("getRandomColor", () => {
	it("returns a string matching <name>.<level> pattern", () => {
		const color = getRandomColor();
		expect(color).toMatch(/^[a-z]+\.[0-9]$/);
	});

	it("returns a color name from the bright colors set", () => {
		const validNames = [
			"red",
			"pink",
			"grape",
			"violet",
			"indigo",
			"blue",
			"cyan",
			"teal",
			"green",
			"lime",
			"yellow",
			"orange",
		];
		for (let i = 0; i < 100; i++) {
			const color = getRandomColor();
			const [name] = color.split(".");
			expect(validNames).toContain(name);
		}
	});

	it("returns a level between 4 and 9 (inclusive)", () => {
		for (let i = 0; i < 100; i++) {
			const color = getRandomColor();
			const level = Number.parseInt(color.split(".")[1], 10);
			expect(level).toBeGreaterThanOrEqual(4);
			expect(level).toBeLessThanOrEqual(9);
		}
	});
});
