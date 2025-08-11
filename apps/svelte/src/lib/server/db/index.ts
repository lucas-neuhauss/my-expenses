import { env } from "$env/dynamic/private";
import { drizzle } from "drizzle-orm/node-postgres";
import { Data, Effect } from "effect";
import { Pool } from "pg";
import * as schema from "./schema";

if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({
	connectionString: env.DATABASE_URL,
});
export const db = drizzle({ client: pool, schema });

export class DbError extends Data.TaggedError("DbError")<{}> {}
export const exec = <T>(dbCommand: Promise<T>) =>
	Effect.tryPromise({
		try: () => dbCommand,
		catch: () => new DbError(),
	}).pipe(Effect.withSpan("db.execute"));
