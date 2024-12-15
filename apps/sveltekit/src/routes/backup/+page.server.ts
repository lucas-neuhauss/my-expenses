import { loadBackup } from "$lib/server/data/backup.js";
import { USER_ADMIN_ID } from "$lib/user.js";
import { error, fail, redirect } from "@sveltejs/kit";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	const userId = event.locals.user.id;
	if (userId !== USER_ADMIN_ID) {
		return fail(404);
	}

	return {};
};

export const actions = {
	"load-backup": async (event) => {
		const user = event.locals.user;
		console.log("[1]", user);
		if (!user || user.id !== USER_ADMIN_ID) {
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
