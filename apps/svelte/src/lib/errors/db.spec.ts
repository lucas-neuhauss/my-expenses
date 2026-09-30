import { describe, expect, it } from "vitest";
import { statusFor } from "./db";

describe("statusFor", () => {
	it("returns 404 for EntityNotFoundError", () => {
		expect(statusFor("EntityNotFoundError")).toBe(404);
	});

	it("returns 404 for SubscriptionNotFoundError", () => {
		expect(statusFor("SubscriptionNotFoundError")).toBe(404);
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

	it("returns 409 for DeleteTransactionError", () => {
		expect(statusFor("DeleteTransactionError")).toBe(409);
	});

	it("returns undefined for an infrastructure tag", () => {
		expect(statusFor("DbError")).toBeUndefined();
	});

	it("returns undefined for an unknown tag", () => {
		expect(statusFor("UnknownError")).toBeUndefined();
	});
});
