import { command, getRequestEvent } from "$app/server";
import { deleteTransactionData, DeleteTransactionError } from "$lib/server/data/transaction";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const deleteTransactionAction = command("unchecked", async (id: unknown) => {
	const numId =
		typeof id === "number" ? id : typeof id === "string" ? parseInt(id, 10) : NaN;
	if (isNaN(numId) || numId <= 0) {
		throw error(400, {
			_tag: "InvalidInputError",
			message: "Invalid transaction ID",
		});
	}

	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	const program = deleteTransactionData({ userId: user.id, transactionId: numId }).pipe(
		Effect.tapError((e) => Effect.logError(e)),
	);

	return runOrThrow(program, {
		DeleteTransactionError: (e) => e,
	});
});

