import { describe, expect, it } from "vitest";
import { statusFor } from "./db";

describe("statusFor", () => {
	it("returns 404 for EntityNotFoundError", () => {
		expect(statusFor("EntityNotFoundError")).toBe(404);
	});

	it("returns 403 for ForbiddenError", () => {
		expect(statusFor("ForbiddenError")).toBe(403);
	});

	it("returns 409 for DeleteWalletError", () => {
		expect(statusFor("DeleteWalletError")).toBe(409);
	});

	it("returns 409 for DeleteCategoryError", () => {
		expect(statusFor("DeleteCategoryError")).toBe(409);
	});

	it("returns 409 for DeleteSubscriptionError", () => {
		expect(statusFor("DeleteSubscriptionError")).toBe(409);
	});

	it("returns 409 for DeleteTransactionError", () => {
		expect(statusFor("DeleteTransactionError")).toBe(409);
	});

	it("throws an Error for unknown tags", () => {
		expect(() => statusFor("UnknownError")).toThrow(
			"No HTTP status mapping for tagged error: UnknownError",
		);
	});

	it("throws an Error for empty string tag", () => {
		expect(() => statusFor("")).toThrow("No HTTP status mapping for tagged error: ");
	});
});
