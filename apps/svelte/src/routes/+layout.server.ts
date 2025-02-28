import { z } from "zod";

export const load = async ({ locals, cookies }) => {
	if (!locals.user) {
		return { user: null };
	}

	const sidebarOpen = z
		.union([z.literal("false"), z.literal("true")])
		.catch("true")
		.transform((v) => v === "true")
		.parse(cookies.get("sidebar:state"));

	return { user: locals.user, sidebarOpen };
};
