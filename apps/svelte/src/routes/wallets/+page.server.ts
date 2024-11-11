import { loadWallets, upsertWallet } from "$lib/server/data/wallet";
import { fail, redirect } from "@sveltejs/kit";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	const userId = event.locals.user.id;
	const wallets = await loadWallets(userId);
	return { wallets };
};

export const actions = {
	"upsert-wallet": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const formData = await event.request.formData();
		return upsertWallet({
			userId: user.id,
			formData,
		});
	},
};
