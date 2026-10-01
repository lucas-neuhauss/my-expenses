import { afterEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./+server";

vi.mock("$app/environment", () => ({ dev: false }));
afterEach(() => vi.unstubAllEnvs());

describe.skipIf(__E2E_TEST_API_ENABLED__)("normal production test API gate", () => {
	it.each([POST, DELETE])(
		"cannot be enabled by runtime test environment flags",
		async (handler) => {
			vi.stubEnv("E2E_TEST", "true");
			vi.stubEnv("NODE_ENV", "test");
			// Gate must run before authentication, parsing or any database work.
			await expect(handler({} as Parameters<typeof POST>[0])).rejects.toMatchObject({
				status: 404,
			});
		},
	);
});
