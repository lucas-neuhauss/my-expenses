import { upsertWallet } from "$lib/server/data/wallet";
import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { fail, redirect } from "@sveltejs/kit";
import { eq, sql } from "drizzle-orm";

export const load = async (event) => {
	if (!event.locals.user) {
		return redirect(302, "/login");
	}

	const userId = event.locals.user.id;
	const wallets = await db
		.select({
			id: table.wallet.id,
			name: table.wallet.name,
			initialBalance: table.wallet.initialBalance,
			balance: sql<number>`cast((sum(${table.transaction.cents}) + ${table.wallet.initialBalance}) as int)`,
		})
		.from(table.transaction)
		.rightJoin(table.wallet, eq(table.transaction.walletId, table.wallet.id))
		.where(eq(table.wallet.userId, userId))
		.orderBy(table.wallet.name)
		.groupBy(table.transaction.userId, table.wallet.id);

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
