import { EntityNotFoundError } from "$lib/errors/db";
import { isHttpError, isRedirect } from "@sveltejs/kit";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { requireId, requirePageUser, requireUser } from "./remote";
import { runOrThrow } from "./remote-helpers";

const USER = { id: "user-1", email: "test@email.com" };

function locals(user: typeof USER | null): App.Locals {
	const session = user ? { user, expires: "2099-01-01T00:00:00.000Z" } : null;
	return {
		user,
		session,
		getSession: async () => session,
	};
}

/** Run `fn` and return whatever it threw. Fails if it did not throw. */
function capture(fn: () => unknown): unknown {
	try {
		fn();
	} catch (thrown) {
		return thrown;
	}
	throw new Error("expected the function to throw");
}

/** Async `capture` for a function that returns a promise. */
async function captureAsync(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
	} catch (thrown) {
		return thrown;
	}
	throw new Error("expected the function to reject");
}

/** An infrastructure error: tagged, but not in the domain registry. */
class FakeInfraError extends Error {
	readonly _tag = "DbError";
}

describe("requireUser", () => {
	it("returns the user when authenticated", () => {
		expect(requireUser(locals(USER))).toEqual(USER);
	});

	it("throws a 401 when anonymous", () => {
		const thrown = capture(() => requireUser(locals(null)));
		expect(isHttpError(thrown)).toBe(true);
		expect((thrown as { status: number }).status).toBe(401);
	});
});

describe("requirePageUser", () => {
	it("returns the user when authenticated", () => {
		expect(requirePageUser(locals(USER))).toEqual(USER);
	});

	it("redirects to /login when anonymous", () => {
		const thrown = capture(() => requirePageUser(locals(null)));
		expect(isRedirect(thrown)).toBe(true);
		expect((thrown as { status: number }).status).toBe(302);
		expect((thrown as { location: string }).location).toBe("/login");
	});
});

describe("runOrThrow", () => {
	it("returns the success value", async () => {
		await expect(runOrThrow(Effect.succeed(42))).resolves.toBe(42);
	});

	it("maps a domain error to its registered HTTP status", async () => {
		const thrown = await captureAsync(() =>
			runOrThrow(Effect.fail(new EntityNotFoundError({ entity: "wallet", id: 1 }))),
		);
		expect(isHttpError(thrown)).toBe(true);
		expect((thrown as { status: number }).status).toBe(404);
		expect((thrown as { body: { _tag: string } }).body._tag).toBe("EntityNotFoundError");
	});

	it("maps a non-domain tagged error to a 500 UnhandledError", async () => {
		const thrown = await captureAsync(() =>
			runOrThrow(Effect.fail(new FakeInfraError())),
		);
		expect(isHttpError(thrown)).toBe(true);
		expect((thrown as { status: number }).status).toBe(500);
		expect((thrown as { body: { _tag: string } }).body._tag).toBe("UnhandledError");
	});
});

describe("requireId", () => {
	it("accepts a positive number", () => {
		expect(requireId(7, "wallet")).toBe(7);
	});

	it("parses a numeric string", () => {
		expect(requireId("7", "wallet")).toBe(7);
	});

	it("rejects a non-positive or non-numeric value with a 400", () => {
		for (const input of [0, -1, "abc", null, undefined, {}]) {
			const thrown = capture(() => requireId(input, "wallet"));
			expect(isHttpError(thrown)).toBe(true);
			expect((thrown as { status: number }).status).toBe(400);
			expect((thrown as { body: { _tag: string } }).body._tag).toBe("InvalidInputError");
		}
	});

	it("names the entity in the error message", () => {
		const thrown = capture(() => requireId("x", "transaction"));
		expect((thrown as { body: { message: string } }).body.message).toBe(
			"Invalid transaction ID",
		);
	});
});
