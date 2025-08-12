/* eslint-disable @typescript-eslint/no-explicit-any */
import { env } from "$env/dynamic/private";
import type { Query } from "drizzle-orm";
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
	Effect.gen(function* () {
		if (typeof (dbCommand as any)?.toSQL === "function") {
			const sql = (dbCommand as any).toSQL() as Query;
			yield* Effect.annotateCurrentSpan("sql", sql.sql);
		}
		return yield* Effect.tryPromise({
			try: () => dbCommand,
			catch: () => new DbError(),
		});
	}).pipe(Effect.withSpan("db.execue"));
