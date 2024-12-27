import { createBackup, loadBackup } from "$lib/server/data/backup.js";
import { error, fail, json, redirect } from "@sveltejs/kit";
import dayjs from "dayjs";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	if (event.locals.user.role !== "admin") {
		return fail(404);
	}

	return {};
};

export const actions = {
	"create-backup": async (event) => {
		const user = event.locals.user;
		console.log("[1]", user);
		if (!user || user.role !== "admin") {
			return error(401);
		}

		const backupData = await createBackup();
		console.log("Backup data");
		console.log(Object.keys(backupData));

		return json(backupData, {
			headers: {
				"Content-Type": "application/json",
				"Content-Disposition": `attachment; filename=expenses-${dayjs().format("YYYY-MM-DD")}.json`,
			},
		});
	},
	"load-backup": async (event) => {
		const user = event.locals.user;
		console.log("[1]", user);
		if (!user || user.role !== "admin") {
			return error(401);
		}

		const formData = await event.request.formData();
		const file = formData.get("file");

		if (!(file instanceof File) || file.type !== "application/json") {
			return error(400, "Invalid file type");
		}

		const fileContent = await file.text();
		const jsonData = JSON.parse(fileContent);

		// Process the JSON data as needed
		console.log(jsonData);

		return loadBackup(user.id, jsonData);
	},
};
