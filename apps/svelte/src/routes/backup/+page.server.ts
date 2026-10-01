import { loadBackupData } from "$lib/server/data/backup";
import {
	decodeBackupFile,
	InvalidBackupError,
	MAX_BACKUP_FILE_BYTES,
} from "$lib/server/data/backup-file";
import { requirePageUser, requireUser } from "$lib/server/remote";
import { runOrThrow } from "$lib/server/remote-helpers";
import { fail, isHttpError } from "@sveltejs/kit";

export const load = async (event) => {
	requirePageUser(event.locals);
	return {};
};

export const actions = {
	"load-backup": async (event) => {
		const user = requireUser(event.locals);
		const formData = await event.request.formData();
		const file = formData.get("file");
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: "Please select a backup file" });
		}
		if (file.size > MAX_BACKUP_FILE_BYTES) {
			return fail(413, { error: "Backup file must not exceed 10 MB" });
		}
		try {
			// Validate content rather than trusting browser-supplied MIME types.
			const data = decodeBackupFile(new Uint8Array(await file.arrayBuffer()));
			return await runOrThrow(loadBackupData({ userId: user.id, data }));
		} catch (cause) {
			if (cause instanceof InvalidBackupError) {
				return fail(400, { error: cause.message });
			}
			if (isHttpError(cause) && cause.status === 400) {
				return fail(400, { error: cause.body.message });
			}
			throw cause;
		}
	},
};
