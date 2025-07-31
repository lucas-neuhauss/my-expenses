import { relations, sql, type SQL } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	date,
	foreignKey,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";

// custom lower function
export function lower(email: AnyPgColumn): SQL {
	return sql`lower(${email})`;
}

const userId = varchar("user_id", { length: 50 }).notNull();

export const wallet = pgTable(
	"wallet",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		userId,
		name: varchar("name", { length: 255 }).notNull(),
		initialBalance: integer("initial_balance").default(0).notNull(),
	},
	(table) => [index("wallet_user_id_idx").on(table.userId)],
);

export const walletRelations = relations(wallet, ({ many }) => ({
	transactions: many(transaction),
}));

export const transaction = pgTable(
	"transaction",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		cents: integer("cents").notNull(),
		type: text("type", { enum: ["income", "expense"] }).notNull(),
		description: text("description"),
		userId,
		categoryId: integer("category_id")
			.references(() => category.id)
			.notNull(),
		walletId: integer("wallet_id")
			.references(() => wallet.id)
			.notNull(),
		transferenceId: text("transference_id"),
		paid: boolean("paid").default(true).notNull(),
		date: date("date", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("transaction_transference_id_idx").on(table.transferenceId),
		index("transaction_wallet_id_idx").on(table.walletId),
		index("transaction_user_id_idx").on(table.userId),
	],
);
export const transactionsRelations = relations(transaction, ({ one }) => ({
	category: one(category, {
		fields: [transaction.categoryId],
		references: [category.id],
	}),
	wallet: one(wallet, {
		fields: [transaction.walletId],
		references: [wallet.id],
	}),
}));

export const category = pgTable(
	"category",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		name: varchar("name", { length: 255 }).notNull(),
		type: text("type", { enum: ["income", "expense"] }).notNull(),
		userId,
		parentId: integer("parent_id"),
		icon: varchar("icon", { length: 255 }).notNull(),
		unique: text("unique", {
			enum: ["transference_in", "transference_out"],
		}),
	},
	(table) => [
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "category_parent_fk",
		}).onDelete("cascade"),
		index("category_user_id_idx").on(table.userId),
	],
);

export const categoryRelations = relations(category, ({ many }) => ({
	transactions: many(transaction),
}));

export const subscription = pgTable(
	"subscription",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		name: varchar("name", { length: 255 }).notNull(),
		cents: integer("cents").notNull(),
		userId,
		categoryId: integer("category_id")
			.references(() => category.id)
			.notNull(),
		startDate: date("start_date", { mode: "string" }).notNull(),
		endDate: date("end_date", { mode: "string" }),
		lastGenerated: date("last_generated", { mode: "string" }).notNull(),
	},
	(table) => [index("subscription_user_id_idx").on(table.userId)],
);
export const subscriptionRelations = relations(subscription, ({ one }) => ({
	category: one(category, {
		fields: [subscription.categoryId],
		references: [category.id],
	}),
}));

export type Transaction = typeof transaction.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
