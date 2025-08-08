import { env } from "$env/dynamic/private";
import * as Pg from "@effect/sql-drizzle/Pg";
import { PgClient } from "@effect/sql-pg";
import { drizzle } from "drizzle-orm/postgres-js";
import { Effect, Layer, Redacted } from "effect";
import postgres from "postgres";
import * as schema from "./schema";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const client = postgres(env.DATABASE_URL);
export const db = drizzle(client, { schema });

export class Db extends Effect.Service<Db>()("Db", {
	effect: Pg.make({ schema }),
}) {
	static Client = this.Default.pipe(
		Layer.provideMerge(PgClient.layer({ url: Redacted.make(env.DATABASE_URL) })),
	);
}
