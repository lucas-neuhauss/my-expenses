import { TransactionSchema, type Transaction } from "$lib/schemas/transaction";
import { upsertTransactionData } from "$lib/server/data/transaction";
import { withTelemetry } from "$lib/server/observability";
import { requirePageUser } from "$lib/server/remote";
import { fail } from "@sveltejs/kit";
import { Effect } from "effect";

export const load = async ({ locals }) => {
	requirePageUser(locals);
};

export const actions = {
	"upsert-transaction": async (event) => {
		const user = event.locals.user;
		if (!user) {
			return fail(401);
		}

		const shouldContinue = event.url.searchParams.get("continue") === "true";

		const program = Effect.fn("[action] - upsert-transaction")(function* () {
			// The form adapter's whole job: decode FormData through the
			// canonical schema and hand the intake module a typed value.
			const formData = yield* Effect.tryPromise(() => event.request.formData());
			const decoded = TransactionSchema["~standard"].validate(
				Object.fromEntries(formData.entries()),
			) as
				| { value: Transaction; issues?: undefined }
				| { issues: ReadonlyArray<{ message: string }> };
			if (!("value" in decoded)) {
				// Decode failures are user-facing: surface the first issue as
				// a 400 form error instead of letting it bubble as a 500.
				return fail(400, {
					error: decoded.issues[0]?.message ?? "Invalid transaction",
				});
			}

			const result = yield* upsertTransactionData({
				userId: user.id,
				data: decoded.value,
			});
			return {
				ok: true,
				shouldContinue,
				toast: result === "created" ? "Transaction created" : "Transaction updated",
			};
		});

		return await Effect.runPromise(
			withTelemetry(program().pipe(Effect.tapCause(Effect.logError))),
		);
	},
};
