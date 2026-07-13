import { upsertTransactionData } from "$lib/server/data/transaction";
import { withTelemetry } from "$lib/server/observability";
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
			withTelemetry(
				program().pipe(
					// Validation failures are user-facing — convert them to a 400
					// form error instead of letting them bubble as a 500.
					Effect.catchTag("UpsertTransactionValidationError", (e) =>
						Effect.succeed(fail(400, { error: e.message })),
					),
					Effect.tapCause(Effect.logError),
				),
			),
		);
	},
};
