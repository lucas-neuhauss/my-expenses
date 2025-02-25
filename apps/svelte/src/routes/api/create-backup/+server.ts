import { createBackup } from "$lib/server/data/backup.js";
import { error, json } from "@sveltejs/kit";
import dayjs from "dayjs";

export async function GET({ locals }) {
	const user = locals.user;
	if (!user || user.role !== "admin") {
		return error(401);
	}

	console.log("\n========");
	console.log("\nCREATING BACKUP\n");
	const backupData = await createBackup();
	console.log("\n========\n");

	return json(backupData, {
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename=expenses-${dayjs().format("YYYY-MM-DD")}.json`,
		},
	});
}
