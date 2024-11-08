import { db } from "$lib/server/db";
import * as table from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export async function upsertWallet({
	userId,
	formData,
}: {
	userId: number;
	formData: FormData;
}) {
	const formObj = Object.fromEntries(formData.entries());
	const formSchema = z.object({
		id: z.coerce.number().int().or(z.literal("new")),
		name: z.string().min(1).max(255),
	});
	const { id, name } = formSchema.parse(formObj);

	if (id === "new") {
		await db.insert(table.wallet).values({
			userId,
			name,
			initialBalance: 0,
		});
	} else {
		await db.update(table.wallet).set({ name }).where(eq(table.wallet.id, id));
	}

	return { ok: true };
}
