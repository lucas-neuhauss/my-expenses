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
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		email: text("email").unique().notNull(),
		role: text("role", { enum: ["admin", "user"] })
			.default("user")
			.notNull(),
		passwordHash: text("password_hash").notNull(),
	},
	(table) => [uniqueIndex("emailUniqueIndex").on(lower(table.email))],
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
	id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
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

export const transaction = pgTable(
	"transaction",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
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
		transferenceId: text("transference_id"),
		paid: boolean("paid").default(true).notNull(),
		date: date("date", { mode: "string" }).notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [index("transference_id_idx").on(table.transferenceId)],
);
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
}));

export const category = pgTable(
	"category",
	{
		id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
		name: varchar("name", { length: 255 }).notNull(),
		type: text("type", { enum: ["income", "expense"] }).notNull(),
		userId: integer("user_id")
			.references(() => user.id)
			.notNull(),
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
	],
);

export const categoryRelations = relations(category, ({ one, many }) => ({
	transactions: many(transaction),
	user: one(user, {
		fields: [category.userId],
		references: [user.id],
	}),
}));

export const subscription = pgTable("subscription", {
	id: integer("id").primaryKey().generatedAlwaysAsIdentity({ startWith: 1000 }),
	name: varchar("name", { length: 255 }).notNull(),
	cents: integer("cents").notNull(),
	userId: integer("user_id")
		.references(() => user.id)
		.notNull(),
	categoryId: integer("category_id")
		.references(() => category.id)
		.notNull(),
	startDate: date("start_date", { mode: "string" }).notNull(),
	endDate: date("end_date", { mode: "string" }),
	lastGenerated: date("last_generated", { mode: "string" }).notNull(),
});
export const subscriptionRelations = relations(subscription, ({ one }) => ({
	user: one(user, {
		fields: [subscription.userId],
		references: [user.id],
	}),
	category: one(category, {
		fields: [subscription.categoryId],
		references: [category.id],
	}),
}));

export type Session = typeof session.$inferSelect;
export type User = typeof user.$inferSelect;
export type Transaction = typeof transaction.$inferSelect;
export type Category = typeof category.$inferSelect;
export type Wallet = typeof wallet.$inferSelect;
export type Subscription = typeof subscription.$inferSelect;
