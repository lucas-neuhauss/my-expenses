import { createBackup } from "$lib/server/data/backup.js";
import { error, json } from "@sveltejs/kit";
import dayjs from "dayjs";

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) {
		return error(401);
	}

	console.log("\n========");
	console.log("\nCREATING BACKUP\n");
	const backupData = await createBackup(user.id);
	console.log("\n========\n");

	return json(backupData, {
		headers: {
			"Content-Type": "application/x-gzip",
			"Content-Disposition": `attachment; filename=expenses-${dayjs().format("YYYY-MM-DD")}.gz`,
		},
	});
}
