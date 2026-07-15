import { command, form, getRequestEvent, query } from "$app/server";
import { WalletSchema, type Wallet } from "$lib/schemas/wallet";
import {
	deleteWalletData,
	getWalletsData,
	upsertWalletData,
} from "$lib/server/data/wallet";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const getWallets = query<Wallet[]>(async () => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(getWalletsData(user.id), {}) as Promise<Wallet[]>;
});

export const upsertWalletCommand = command(WalletSchema, async (data) => {
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

export const upsertWalletAction = form(WalletSchema, async (data) => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	await runOrThrow(
		upsertWalletData({ userId: user.id, data }).pipe(
			Effect.tapError((e) => Effect.logError(e)),
		),
		{
			EntityNotFoundError: (e) => e,
		},
	);
	return data.id === 0 ? "Wallet created" : "Wallet updated";
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
