import { loadBackupData } from "$lib/server/data/backup.js";
import { withTelemetry } from "$lib/server/observability.js";
import { requirePageUser, requireUser } from "$lib/server/remote";
import { fail } from "@sveltejs/kit";
import { Effect } from "effect";
import { ungzip } from "pako";

export const load = async (event) => {
	requirePageUser(event.locals);

	return {};
};

export const actions = {
	"load-backup": async (event) => {
		const user = requireUser(event.locals);

		// Validate file before entering Effect context
		const formData = await event.request.formData();
		const file = formData.get("file");

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: "Please select a backup file" });
		}

		if (!["application/x-gzip", "application/gzip"].includes(file.type)) {
			return fail(400, { error: "Invalid file type. Please select a .gz file" });
		}

		const program = Effect.fn("[action] - load-backup")(function* () {
			// Uncompress and prepare the data
			const fileContent = yield* Effect.tryPromise(() => file.text());
			const binaryData = Buffer.from(fileContent, "base64");
			const decompressed = ungzip(binaryData, { to: "string" });
			const jsonData = JSON.parse(decompressed);

			// Load the data with the processed JSON
			return yield* loadBackupData({ userId: user.id, data: jsonData });
		});

		return await Effect.runPromise(
			withTelemetry(program()).pipe(Effect.tapCause(Effect.logError)),
		);
	},
};
