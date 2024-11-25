import { error, json } from "@sveltejs/kit";

export async function POST({ locals }) {
	const user = locals.user;
	if (!user) {
		return error(400, "Something went wrong");
	}
	const userId = user.id;

	// // 1. Find all transferences
	// const transferences = await db.query.transference.findMany({
	// 	where: eq(table.transference.userId, userId),
	// });
	//
	// // 2. For each transference, create a uuidv4 and add it to each transaction
	// for (const transference of transferences) {
	// 	const { transactionInId, transactionOutId } = transference;
	//
	// 	const transactions = await db.query.transaction.findMany({
	// 		where: (table, { inArray }) =>
	// 			inArray(table.id, [transactionInId, transactionOutId]),
	// 	});
	// 	if (transactions.length !== 2) {
	// 		console.log("\n\n=========");
	// 		console.log(`Error. Transference id: ${transference.id}`);
	// 	}
	//
	// 	const transferenceId = uuidv4();
	// 	for (const transaction of transactions) {
	// 		await db
	// 			.update(table.transaction)
	// 			.set({ transferenceId })
	// 			.where(eq(table.transaction.id, transaction.id));
	// 	}
	// }

	return json({ ok: true });
}
