import { queryClient } from "$lib/integrations/tanstack-query/query-client";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/svelte-db";
import * as z from "zod";

const CategorySchema = z.object({
	id: z.number(),
	name: z.string(),
	type: z.enum(["income", "expense"]),
	parentId: z.int().nullable(),
	icon: z.string(),
	unique: z.enum(["transference_in", "transference_out"]).nullable(),
});

export const categoryCollection = createCollection(
	queryCollectionOptions({
		queryClient: queryClient,
		schema: CategorySchema,
		queryKey: ["category"],
		queryFn: async () => {
			const res = await fetch("/api/categories");
			const json = await res.json();
			return json;
		},
		getKey: (item) => item.id,
		// Handle all CRUD operations
		onInsert: async ({ transaction }) => {
			const { modified: newTodo } = transaction.mutations[0];

			// const serverTodo = await orpc.todo.addTodo.call({ title: newTodo.title });

			// Sync server-computed fields (like server-generated IDs, timestamps, etc.)
			// to the collection's synced data store
			// todoCollection.utils.writeInsert(serverTodo);

			return { refetch: false };
		},
		onUpdate: async ({ transaction }) => {
			const { original, modified } = transaction.mutations[0];
			// const updatedTodo = await orpc.todo.updateTodo.call({
			// 	id: original.id,
			// 	completed: modified.completed,
			// });

			// todoCollection.utils.writeUpdate(updatedTodo);

			return { refetch: false };
		},
		onDelete: async ({ transaction }) => {
			const { original } = transaction.mutations[0];
			// await orpc.todo.deleteTodo.call({
			// 	id: original.id,
			// });
			categoryCollection.utils.writeDelete(original.id);
			return { refetch: false };
		},
	}),
);
