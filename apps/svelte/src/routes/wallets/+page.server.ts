import { upsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema.js";
import { deleteWallet, loadWallets, upsertWallet } from "$lib/server/data/wallet";
import { error, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod } from "sveltekit-superforms/adapters";
import { z } from "zod";

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}

	const userId = locals.user.id;
	const wallets = await loadWallets(userId);
	return { wallets };
};

export const actions = {
	"upsert-wallet": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const form = await superValidate(event, zod(upsertWalletSchema));
		if (!form.valid) {
			return message(form, { type: "error", text: "Invalid form" });
		}

		try {
			const text = await upsertWallet({
				userId: user.id,
				data: form.data,
			});
			return message(form, { type: "success", text });
		} catch (error) {
			const { text } = z
				.object({ message: z.string() })
				.transform((v) => ({ text: v.message }))
				.catch({ text: "Something went wrong" })
				.parse(error);
			return message(form, { type: "error", text }, { status: 400 });
		}
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
