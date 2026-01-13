import { upsertTransactionData } from "$lib/server/data/transaction";
import { NodeSdkLive } from "$lib/server/observability";
import { fail, redirect } from "@sveltejs/kit";
import { Effect } from "effect";

export const load = async ({ locals }) => {
	if (!locals.user) {
		return redirect(302, "/login");
	}
};

export const actions = {
	"upsert-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const searchParams = event.url.searchParams;
		const shouldContinue = searchParams.get("continue") === "true";

		const program = Effect.fn("[action] - upsert-transaction")(function* () {
			const formData = yield* Effect.tryPromise(() => event.request.formData());
			const result = yield* upsertTransactionData({
				userId: user.id,
				shouldContinue,
				formData,
			});
			return result;
		});

		return await Effect.runPromise(
			program().pipe(Effect.provide(NodeSdkLive), Effect.tapErrorCause(Effect.logError)),
		);
	},
};
