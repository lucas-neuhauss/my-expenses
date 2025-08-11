import { loadWallets } from "$lib/server/data/wallet";
import { NodeSdkLive } from "$lib/server/observability";
import type { UserId } from "$lib/types.js";
import { redirect } from "@sveltejs/kit";
import { Effect } from "effect";

const program = Effect.fn("[load] - /wallets")(function* ({
	userId,
}: {
	userId: UserId;
}) {
	const wallets = yield* loadWallets(userId);
	return { wallets };
});

export const load = async ({ locals, url, untrack }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}
	const isDelete = untrack(() => url.searchParams.get("delete") === "true");
	if (isDelete) return redirect(302, "/wallets");

	return await Effect.runPromise(
		program({ userId: locals.user.id }).pipe(
			Effect.provide(NodeSdkLive),
			Effect.tapErrorCause(Effect.logError),
		),
	);
};
