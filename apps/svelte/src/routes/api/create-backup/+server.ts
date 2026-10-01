import { createBackupData } from "$lib/server/data/backup.js";
import { withTelemetry } from "$lib/server/observability.js";
import { requireUser } from "$lib/server/remote";
import dayjs from "dayjs";
import { Effect } from "effect";

export async function GET({ locals }) {
	const user = requireUser(locals);

	const program = Effect.fn("[api] - create-backup")(function* () {
		yield* Effect.log("\n========");
		yield* Effect.log("\nCREATING BACKUP\n");
		const backupData = yield* createBackupData({ userId: user.id });
		yield* Effect.log("\n========\n");
		return backupData;
	});

	const backupData = await Effect.runPromise(
		withTelemetry(program()).pipe(Effect.tapCause(Effect.logError)),
	);

	return new Response(Buffer.from(backupData, "base64"), {
		headers: {
			"Content-Type": "application/x-gzip",
			"Content-Disposition": `attachment; filename=expenses-${dayjs().format("YYYY-MM-DD")}.gz`,
		},
	});
}
