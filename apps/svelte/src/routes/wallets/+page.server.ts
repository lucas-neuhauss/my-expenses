import { requirePageUser } from "$lib/server/remote";

export const load = async ({ locals }) => {
	requirePageUser(locals);
};
