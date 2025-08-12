import { createBackupData } from "$lib/server/data/backup.js";
import { NodeSdkLive } from "$lib/server/observability.js";
import { error, json } from "@sveltejs/kit";
import dayjs from "dayjs";
import { Effect } from "effect";

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) {
		return error(401);
	}

	const program = Effect.fn("[api] - create-backup")(function* () {
		yield* Effect.log("\n========");
		yield* Effect.log("\nCREATING BACKUP\n");
		const backupData = yield* createBackupData({ userId: user.id });
		yield* Effect.log("\n========\n");
		return backupData;
	});

	const backupData = await Effect.runPromise(
		program().pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
	);

	return json(backupData, {
		headers: {
			"Content-Type": "application/x-gzip",
			"Content-Disposition": `attachment; filename=expenses-${dayjs().format("YYYY-MM-DD")}.gz`,
		},
	});
}
