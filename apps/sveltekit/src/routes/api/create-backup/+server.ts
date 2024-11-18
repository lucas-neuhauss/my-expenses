import { db } from "$lib/server/db";
import * as schema from "$lib/server/db/schema";
import { error } from "@sveltejs/kit";
import dayjs from "dayjs";
import { PgTable } from "drizzle-orm/pg-core";

export async function POST({ locals }) {
	console.log("\n\n========");
	const user = locals.user;
	if (!user || user.id !== 1000) {
		return error(400);
	}

	const res: any = {};
	for (const [key, value] of Object.entries(schema)) {
		console.log(`key: ${key} | isTable: ${value instanceof PgTable}`);
		if (value instanceof PgTable) {
			const tableRows = await db.select().from(value);
			res[key] = tableRows;
		}
	}
	const date = dayjs().format("YYYY-MM-DD_HH:mm");

	return new Response(JSON.stringify(res), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename=expenses-${date}.json`,
		},
	});
}
