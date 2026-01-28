<script lang="ts">
	/**
	 * Story-friendly version of the categories page.
	 * Uses props instead of global collections for testability.
	 */
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import CategoryCardSkeleton from "$lib/components/skeletons/category-card-skeleton.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { nestCategories, type NestedCategory } from "$lib/utils/category.js";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Trash from "@lucide/svelte/icons/trash";
	import type { MockCategory } from "../mocks/category-data";
	import UpsertCategoryDialogMock from "./upsert-category-dialog-mock.svelte";

	let {
		categories = [],
		isLoading = false,
		onCreateCategory,
		onEditCategory,
		onDeleteCategory,
	}: {
		categories: MockCategory[];
		isLoading?: boolean;
		onCreateCategory?: (data: { name: string; type: string; icon: string }) => void;
		onEditCategory?: (id: number, data: Partial<MockCategory>) => void;
		onDeleteCategory?: (id: number) => void;
	} = $props();

	let currentType = $state<"expense" | "income">("expense");

	let filteredCategories = $derived(
		categories.filter((c) => c.type === currentType && c.unique === null),
	);
	let nestedCategories = $derived(nestCategories(filteredCategories));

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
		currentType = newType as "expense" | "income";
	};

	const handleSaveCategory = (data: { name: string; icon: string }) => {
		if (upsertDialog.category) {
			onEditCategory?.(upsertDialog.category.id, data);
		} else {
			onCreateCategory?.({ ...data, type: currentType });
		}
		upsertDialog.open = false;
	};

	const handleDeleteConfirm = () => {
		if (deleteDialog.category) {
			onDeleteCategory?.(deleteDialog.category.id);
		}
		deleteDialog.open = false;
	};
</script>

<UpsertCategoryDialogMock
	bind:open={upsertDialog.open}
	category={upsertDialog.category}
	currentType={currentType}
	onSave={handleSaveCategory}
/>

<ConfirmDialog
	open={deleteDialog.open}
	title="Are you sure?"
	description={deleteDialog.category
		? `Are you sure you want to delete the "${deleteDialog.category.name}" category?`
		: ""}
	remoteCommand={handleDeleteConfirm}
	onOpenChange={(open) => (deleteDialog.open = open)}
/>

<div class="container flex flex-col gap-y-4 px-8 pb-10">
	<Tabs.Root value={currentType} onValueChange={handleTypeChange}>
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

	{#if isLoading}
		<CategoryCardSkeleton />
	{:else if nestedCategories.length === 0}
		<div class="text-muted-foreground py-12 text-center" data-testid="empty-state">
			<p>No categories yet.</p>
			<p class="text-sm">Click "Create Category" to add your first category.</p>
		</div>
	{:else}
		{#each nestedCategories as category (category.id)}
			<Card.Root class="w-full p-0" data-testid="category-card">
				<Card.Content class="flex items-center justify-between p-5 pt-3">
					<div class="flex flex-col items-start justify-between gap-3">
						<div class="mt-0.5 flex items-center justify-start gap-x-3">
							<div
								class="flex size-9 items-center justify-center rounded-full bg-gray-800"
							>
								<img
									alt="category icon"
									src={`/images/category/${category.icon}`}
									class="size-5"
								/>
							</div>
							<p data-testid="category-name">{category.name}</p>
						</div>

						{#if category.children.length > 0}
							<div class="flex flex-wrap gap-2">
								{#each category.children as subcategory (subcategory.id)}
									<div
										class="flex items-center gap-1.5 rounded border px-2 py-1"
										data-testid="subcategory"
									>
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
							data-testid="edit-button"
						>
							<Pencil />
						</Button>
						<Button
							title="Delete category"
							variant="ghost"
							class="size-8 p-0 [&_svg]:size-3.5"
							onclick={() => (deleteDialog = { open: true, category })}
							data-testid="delete-button"
						>
							<Trash />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	{/if}
</div>
