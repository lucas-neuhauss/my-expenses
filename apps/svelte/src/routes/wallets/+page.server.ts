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

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}

	return await Effect.runPromise(
		program({ userId: locals.user.id }).pipe(
			Effect.provide(NodeSdkLive),
			Effect.tapErrorCause(Effect.logError),
		),
	);
};
