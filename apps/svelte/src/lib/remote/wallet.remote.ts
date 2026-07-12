import { command, form, getRequestEvent } from "$app/server";
import { WalletSchema } from "$lib/schemas/wallet";
import {
	deleteWalletData,
	DeleteWalletError,
	upsertWalletData,
} from "$lib/server/data/wallet";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const upsertWalletAction = form(WalletSchema, async (data) => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(
		upsertWalletData({ userId: user.id, data }).pipe(
			Effect.tapError((e) => Effect.logError(e)),
		),
		{
			EntityNotFoundError: (e) => e,
		},
	);
});

export const deleteWalletAction = command("unchecked", async (id: unknown) => {
	const numId =
		typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
	if (isNaN(numId) || numId <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: "Invalid wallet ID",
		});
	}

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(
		deleteWalletData({ userId: user.id, id: numId }).pipe(
			Effect.tapError((e) => Effect.logError(e)),
		),
		{
			EntityNotFoundError: (e) => e,
			DeleteWalletError: (e) => e,
		},
	);
});


