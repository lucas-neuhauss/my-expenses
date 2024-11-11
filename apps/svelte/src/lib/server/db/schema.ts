import { relations, sql, type SQL } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	date,
	foreignKey,
	integer,
	pgTable,
	serial,
	text,
	timestamp,
	uniqueIndex,
	varchar,
} from "drizzle-orm/pg-core";

// custom lower function
export function lower(email: AnyPgColumn): SQL {
	return sql`lower(${email})`;
}

export const user = pgTable(
	"user",
	{
		id: serial("id").primaryKey(),
		email: text("email").unique().notNull(),
		passwordHash: text("password_hash").notNull(),
	},
	(table) => ({
		emailUniqueIndex: uniqueIndex("emailUniqueIndex").on(lower(table.email)),
	}),
);

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	userId: integer("user_id")
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp("expires_at", {
		withTimezone: true,
		mode: "date",
	}).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
	transactions: many(transaction),
	categories: many(category),
	wallets: many(wallet),
}));

export const wallet = pgTable("wallet", {
	id: serial("id").primaryKey(),
	userId: integer("user_id")
		.references(() => user.id)
		.notNull(),
	name: varchar("name", { length: 255 }).notNull(),
	initialBalance: integer("initial_balance").default(0).notNull(),
});

export const walletRelations = relations(wallet, ({ one, many }) => ({
	user: one(user, {
		fields: [wallet.userId],
		references: [user.id],
	}),
	transactions: many(transaction),
}));

export const transaction = pgTable("transaction", {
	id: serial("id").primaryKey(),
	cents: integer("cents").notNull(),
	type: text("type", { enum: ["income", "expense"] }).notNull(),
	description: text("description"),
	userId: integer("user_id")
		.references(() => user.id)
		.notNull(),
	categoryId: integer("category_id")
		.references(() => category.id)
		.notNull(),
	walletId: integer("wallet_id")
		.references(() => wallet.id)
		.notNull(),
	isTransference: boolean("is_transference").default(false).notNull(),
	date: date("date", { mode: "string" }).notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export const transactionsRelations = relations(transaction, ({ one }) => ({
	user: one(user, {
		fields: [transaction.userId],
		references: [user.id],
	}),
	category: one(category, {
		fields: [transaction.categoryId],
		references: [category.id],
	}),
	wallet: one(wallet, {
		fields: [transaction.walletId],
		references: [wallet.id],
	}),
	transferenceOut: one(transference, {
		fields: [transaction.id],
		references: [transference.transactionOutId],
		relationName: "transactionOut",
	}),
	transferenceIn: one(transference, {
		fields: [transaction.id],
		references: [transference.transactionOutId],
		relationName: "transactionIn",
	}),
}));

export const transference = pgTable("transference", {
	id: serial("id").primaryKey(),
	transactionOutId: integer("transaction_out_id")
		.references(() => transaction.id)
		.unique()
		.notNull(),
	transactionInId: integer("transaction_in_id")
		.references(() => transaction.id)
		.unique()
		.notNull(),
});
export const transferenceRelations = relations(transference, ({ one }) => ({
	transactionOut: one(transaction, {
		fields: [transference.transactionOutId],
		references: [transaction.id],
		relationName: "transactionOut",
	}),
	transactionIn: one(transaction, {
		fields: [transference.transactionInId],
		references: [transaction.id],
		relationName: "transactionIn",
	}),
}));

export const category = pgTable(
	"category",
	{
		id: serial("id").primaryKey(),
		name: varchar("name", { length: 255 }).notNull(),
		type: text("type", { enum: ["income", "expense"] }).notNull(),
		userId: integer("user_id").references(() => user.id),
		parentId: integer("parent_id"),
		iconName: varchar("icon_name", { length: 255 }).notNull(),
		unique: text("unique", { enum: ["transaction_in", "transaction_out"] }),
	},
	(table) => ({
		parentReference: foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "category_parent_fk",
		}).onDelete("cascade"),
	}),
);

export const categoryRelations = relations(category, ({ one, many }) => ({
	transactions: many(transaction),
	user: one(user, {
		fields: [category.userId],
		references: [user.id],
	}),
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
