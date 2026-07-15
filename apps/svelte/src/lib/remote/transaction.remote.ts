import { command, getRequestEvent, query } from "$app/server";
import { TransactionRow } from "$lib/schemas/transaction";
import {
	deleteTransactionData,
	getTransactionsData,
	upsertTransactionData,
} from "$lib/server/data/transaction";
import { runOrThrow } from "$lib/server/remote-helpers";
import { error } from "@sveltejs/kit";
import { Effect } from "effect";

export const getTransactions = query<TransactionRow[]>(async () => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	return runOrThrow(getTransactionsData({ userId: user.id }), {}) as Promise<
		TransactionRow[]
	>;
});

export const upsertTransactionCommand = command("unchecked", async (data: unknown) => {
	const { locals } = getRequestEvent();
	const user = locals.user;
	if (!user) {
		throw error(401);
	}

	// Convert the data object to FormData for upsertTransactionData
	const dataObj = data as Record<string, unknown>;
	const formData = new FormData();

	for (const [key, value] of Object.entries(dataObj)) {
		if (value !== undefined && value !== null) {
			formData.append(key, String(value));
		}
	}

	const program = upsertTransactionData({
		userId: user.id,
		shouldContinue: false,
		formData,
	}).pipe(Effect.tapError((e) => Effect.logError(e)));

	return runOrThrow(program, {
		UpsertTransactionValidationError: (e) => e,
	});
});

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
