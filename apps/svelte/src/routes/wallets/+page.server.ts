import { loadWallets } from "$lib/server/data/wallet";
import { redirect } from "@sveltejs/kit";

export const load = async ({ locals, url, untrack }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}

	const isDelete = untrack(() => url.searchParams.get("delete") === "true");
	if (isDelete) return redirect(302, "/wallets");

	const userId = locals.user.id;
	const wallets = await loadWallets(userId);
	return { wallets };
};
