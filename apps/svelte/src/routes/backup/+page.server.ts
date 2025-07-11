import { loadBackup } from "$lib/server/data/backup.js";
import { error, redirect } from "@sveltejs/kit";
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

		try {
			const formData = await event.request.formData();
			const file = formData.get("file");
			console.log(file);

			if (
				!(file instanceof File) ||
				!["application/x-gzip", "application/gzip"].includes(file.type)
			) {
				return error(400, "Invalid file type");
			}

			// Uncompress and prepare the data
			const fileContent = await file.text();
			const binaryData = Buffer.from(fileContent, "base64");
			const decompressed = ungzip(binaryData, { to: "string" });
			const jsonData = JSON.parse(decompressed);

			// Load the data with the processed JSON
			return loadBackup(user.id, jsonData);
		} catch (error) {
			console.log(error);
		}
	},
};
