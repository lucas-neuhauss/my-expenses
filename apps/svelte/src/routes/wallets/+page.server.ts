import { upsertWalletSchema } from "$lib/components/upsert-wallet/upsert-wallet-schema";
import { deleteWallet, loadWallets, upsertWallet } from "$lib/server/data/wallet";
import { FormUtil } from "$lib/utils/form";
import { error, fail, redirect } from "@sveltejs/kit";
import { message, superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { z } from "zod/v4";

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

export const actions = {
	"upsert-wallet": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const form = await superValidate(event, zod4(upsertWalletSchema));
		if (!form.valid) {
			return message(form, FormUtil.getErrorMessage("Invalid form"));
		}
		try {
			const text = await upsertWallet({
				userId: user.id,
				data: form.data,
			});
			return message(form, { type: "success", text });
		} catch (error) {
			return message(form, FormUtil.getErrorMessage(error), { status: 400 });
		}
	},
	"delete-wallet": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return error(401);
		}

		const searchParams = event.url.searchParams;
		try {
			const idSafeParse = z.coerce
				.number()
				.int()
				.min(1)
				.safeParse(searchParams.get("id"));
			if (!idSafeParse.success) {
				return FormUtil.getErrorForm("Invalid wallet id");
			}
			const id = idSafeParse.data;
			const text = await deleteWallet({ userId: user.id, id });
			return { form: { message: { type: "success", text } } };
		} catch (error) {
			return fail(400, FormUtil.getErrorForm(error));
		}
	},
};
