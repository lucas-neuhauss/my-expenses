import type { Subscription } from "$lib/server/db/schema.js";
import { redirect } from "@sveltejs/kit";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	const subscriptions: Subscription[] = [
		{
			id: 1000,
			name: "Netflix",
			cents: 1000,
			categoryId: 1055,
			userId: 1000,
			startDate: "2024-11-25",
			endDate: null,
			lastGenerated: "2024-11-25",
		},
	];
	return {
		subscriptions,
	};
};
