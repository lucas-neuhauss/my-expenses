import * as z from "zod";

export const load = async ({ locals, cookies }) => {
	const session = await locals.getSession();
	const user = session?.user ?? null;

	const sidebarOpen = z
		.union([z.literal("false"), z.literal("true")])
		.catch("true")
		.transform((v) => v === "true")
		.parse(cookies.get("sidebar:state"));

	return {
		user: user ? { id: user.id, email: user.email } : null,
		sidebarOpen,
	};
};
