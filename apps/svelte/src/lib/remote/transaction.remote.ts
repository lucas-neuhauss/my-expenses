import { command, query } from "$app/server";
import { deleteTransactionData, getTransactionsData } from "$lib/server/data/transaction";
import { authenticated, requireId, type SessionUser } from "$lib/server/remote";

export const getTransactions = query(
	authenticated((user: SessionUser) => getTransactionsData({ userId: user.id })),
);

export const deleteTransactionAction = command(
	"unchecked",
	authenticated((user: SessionUser, input: unknown) =>
		deleteTransactionData({
			userId: user.id,
			transactionId: requireId(input, "transaction"),
		}),
	),
);
