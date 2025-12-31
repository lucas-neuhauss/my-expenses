<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { UpsertCategory } from "$lib/components/upsert-category";
	import { categoryCollection } from "$lib/db-collectons/categories.js";
	import { deleteCategoryAction } from "$lib/remote/category.remote.js";
	import type { NestedCategory } from "$lib/utils/category.js";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Trash from "@lucide/svelte/icons/trash";
	import { useLiveQuery } from "@tanstack/svelte-db";
	import { eq } from "@tanstack/db";
	import { useQueryState, parseAsStringLiteral } from "nuqs-svelte";
	import { toast } from "svelte-sonner";

	const type = useQueryState(
		"type",
		parseAsStringLiteral(["expense", "income"] as const).withDefault("expense"),
	);

	const query = useLiveQuery((q) =>
		q
			.from({ category: categoryCollection })
			.where(({ category }) => eq(category.type, type.current))
			.orderBy(({ category }) => category.name, "asc"),
	);

	// TODO: Move this to a utility function
	let nestedCategories = $derived(
		query.data.reduce<NestedCategory[]>((acc, category) => {
			if (category.parentId === null) {
				acc.push({ ...category, children: [] });
			} else {
				const parent = acc.find((c) => c.id === category.parentId);
				if (parent) {
					parent.children.push(category);
				}
			}
			return acc;
		}, []),
	);

	let upsertDialog = $state<{
		open: boolean;
		category: NestedCategory | null;
	}>({
		open: false,
		category: null,
	});
	let deleteDialog = $state<{
		open: boolean;
		category: NestedCategory | null;
	}>({
		open: false,
		category: null,
	});

	const handleTypeChange = (newType: string) => {
		type.set(() => newType as "expense" | "income");
	};
</script>

<svelte:head>
	<title>Categories - My Expenses</title>
</svelte:head>

<UpsertCategory bind:open={upsertDialog.open} bind:category={upsertDialog.category} />

<ConfirmDialog
	open={deleteDialog.open}
	title="Are you sure?"
	description={deleteDialog.category
		? `Are you sure you want to delete the "${deleteDialog.category.name}" category?`
		: ""}
	remoteCommand={async () => {
		if (!deleteDialog.category) return;
		try {
			const res = await deleteCategoryAction(deleteDialog.category.id);
			if (res.ok) {
				toast.success(res.message);
				deleteDialog.open = false;
				invalidateAll();
			} else {
				toast.error(res.message);
			}
		} catch {
			toast.error("Something went wrong. Please try again later.");
		}
	}}
/>

<div class="container flex flex-col gap-y-4 px-8 pb-10">
	<Tabs.Root value={type.current} onValueChange={handleTypeChange}>
		<div class="flex items-center gap-4">
			<Button
				title="Create category"
				autofocus
				variant="outline"
				onclick={() => (upsertDialog = { open: true, category: null })}
			>
				Create Category
			</Button>
			<Tabs.List>
				<Tabs.Trigger value="expense">Expense</Tabs.Trigger>
				<Tabs.Trigger value="income">Income</Tabs.Trigger>
			</Tabs.List>
		</div>
	</Tabs.Root>

	{#each nestedCategories as category (category.id)}
		<Card.Root class="w-full p-0">
			<Card.Content class="flex items-center justify-between p-5 pt-3">
				<div class="flex flex-col items-start justify-between gap-3">
					<div class="mt-0.5 flex items-center justify-start gap-x-3">
						<div class="flex size-9 items-center justify-center rounded-full bg-gray-800">
							<img
								alt="category icon"
								src={`/images/category/${category.icon}`}
								class="size-5"
							/>
						</div>
						<p>{category.name}</p>
					</div>

					{#if category.children.length > 0}
						<div class="flex flex-wrap gap-2">
							{#each category.children as subcategory (subcategory.id)}
								<div class="flex items-center gap-1.5 rounded border px-2 py-1">
									<img
										alt="subcategory icon"
										src={`/images/category/${subcategory.icon}`}
										class="size-3"
									/>
									<span class="text-sm">{subcategory.name}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<div class="shrink-0">
					<Button
						title="Edit category"
						size="icon"
						variant="ghost"
						onclick={() => (upsertDialog = { open: true, category })}
					>
						<Pencil />
					</Button>
					<Button
						title="Delete category"
						variant="ghost"
						class="size-8 p-0 [&_svg]:size-3.5"
						onclick={() => (deleteDialog = { open: true, category })}
					>
						<Trash />
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
