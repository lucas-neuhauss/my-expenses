import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from "$env/static/public";
import { createServerClient } from "@supabase/ssr";
import * as z from "zod";

export const load = async ({ cookies }) => {
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: { fetch },
		cookies: {
			getAll() {
				return cookies.getAll();
			},
		},
	});

	const {
		data: { user },
	} = await supabase.auth.getUser();

	const sidebarOpen = z
		.union([z.literal("false"), z.literal("true")])
		.catch("true")
		.transform((v) => v === "true")
		.parse(cookies.get("sidebar:state"));

	return {
		user: user ? { email: user.email } : null,
		sidebarOpen,
	};
};
