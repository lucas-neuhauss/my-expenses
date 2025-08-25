import { command, getRequestEvent } from "$app/server";
import { deleteTransactionData } from "$lib/server/data/transaction";
import { NodeSdkLive } from "$lib/server/observability";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";
import * as z from "zod";

export const deleteTransactionAction = command(z.int(), async (transactionId) => {
	const program = Effect.fn("[remote] - delete-transaction")(function* () {
		const {
			locals: { user },
		} = getRequestEvent();
		if (!user) {
			return error(401);
		}

		return yield* deleteTransactionData({ userId: user.id, transactionId });
	});

	return Effect.runPromise(
		program().pipe(Effect.provide(NodeSdkLive), Effect.catchAllCause(Effect.logError)),
	);
});
