import { loadBackupData } from "$lib/server/data/backup.js";
import { NodeSdkLive } from "$lib/server/observability.js";
import { error, redirect } from "@sveltejs/kit";
import { Effect } from "effect";
import { ungzip } from "pako";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	return {};
};

export const actions = {
	"load-backup": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const program = Effect.fn("[action] - load-backup")(function* () {
			const formData = yield* Effect.tryPromise(() => event.request.formData());
			const file = formData.get("file");
			yield* Effect.log(file);

			if (
				!(file instanceof File) ||
				!["application/x-gzip", "application/gzip"].includes(file.type)
			) {
				return error(400, "Invalid file type");
			}

			// Uncompress and prepare the data
			const fileContent = yield* Effect.tryPromise(() => file.text());
			const binaryData = Buffer.from(fileContent, "base64");
			const decompressed = ungzip(binaryData, { to: "string" });
			const jsonData = JSON.parse(decompressed);

			// Load the data with the processed JSON
			return yield* loadBackupData({ userId: user.id, data: jsonData });
		});

		return await Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
		);
	},
};
