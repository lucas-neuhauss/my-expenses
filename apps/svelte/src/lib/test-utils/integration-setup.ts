import { afterAll, vi } from "vitest";

vi.mock("$env/static/private", () => {
	const url = process.env.TEST_DATABASE_URL;
	if (!url || !new URL(url).pathname.startsWith("/myexpenses_test_")) {
		throw new Error("Integration tests require a dedicated myexpenses_test_* database.");
	}
	return { DATABASE_URL: url, AUTH_SECRET: "integration-test-secret-not-for-production" };
});

afterAll(async () => {
	const { db } = await import("$lib/server/db");
	await db.$client.end();
});
