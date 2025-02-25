import { deleteWallet, loadWallets, upsertWallet } from "$lib/server/data/wallet";
import { error, redirect } from "@sveltejs/kit";
import { z } from "zod";

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
			return error(401);
		}

		const formData = await event.request.formData();
		return upsertWallet({
			userId: user.id,
			formData,
		});
	},
	"delete-wallet": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const searchParams = event.url.searchParams;
		const id = z.coerce.number().int().min(1).parse(searchParams.get("id"));
		return deleteWallet({ userId: user.id, id });
	},
};
