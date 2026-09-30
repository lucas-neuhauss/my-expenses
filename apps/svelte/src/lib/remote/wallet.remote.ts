import { command, form, query } from "$app/server";
import { WalletSchema, type Wallet } from "$lib/schemas/wallet";
import {
	deleteWalletData,
	getWalletsData,
	upsertWalletData,
} from "$lib/server/data/wallet";
import { authenticated, requireId, type SessionUser } from "$lib/server/remote";
import { Effect } from "effect";

export const getWallets = query(authenticated((user) => getWalletsData(user.id)));

export const upsertWalletCommand = command(
	WalletSchema,
	authenticated((user: SessionUser, data: Wallet) =>
		upsertWalletData({ userId: user.id, data }),
	),
);

export const upsertWalletAction = form(
	WalletSchema,
	authenticated((user: SessionUser, data: Wallet) =>
		Effect.gen(function* () {
			yield* upsertWalletData({ userId: user.id, data });
			return data.id === 0 ? "Wallet created" : "Wallet updated";
		}),
	),
);

export const deleteWalletAction = command(
	"unchecked",
	authenticated((user: SessionUser, input: unknown) =>
		deleteWalletData({ userId: user.id, id: requireId(input, "wallet") }),
	),
);
