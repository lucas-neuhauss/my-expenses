<script lang="ts">
	import { page } from "$app/state";
	import ConfirmDialog from "$lib/components/confirm-dialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import { UpsertCategory } from "$lib/components/upsert-category";
	import type { NestedCategory } from "$lib/utils/category.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";
	import { toast } from "svelte-sonner";
	import * as Tabs from "$lib/components/ui/tabs/index.js";
	import { goto } from "$app/navigation";

	let { data, form } = $props();
	$effect(() => {
		if (typeof form?.toast === "string") {
			toast.success(form.toast);
		}
	});

	let upsertDialog = $state<{
		open: boolean;
		category: NestedCategory | null;
	}>({
		open: false,
		category: null,
	});

	$effect(() => {
		if (!!form && !form.ok) {
			toast.error(form.message ?? "Something went wrong");
		}
	});

	const handleClickCreate = () => {
		upsertDialog = {
			open: true,
			category: null,
		};
	};

	const handleClickEdit = (category: NestedCategory) => {
		upsertDialog = {
			open: true,
			category,
		};
	};

	const handleTypeChange = (type: string) => {
		const url = new URL(page.url.href);

		if (type === "expense") {
			url.searchParams.delete("type");
		} else {
			url.searchParams.set("type", type);
		}
		goto(url.href);
	};
</script>

<svelte:head>
	<title>Categories - My Expenses</title>
</svelte:head>

<UpsertCategory bind:open={upsertDialog.open} bind:category={upsertDialog.category} />

<div class="container flex flex-col gap-y-4">
	<Tabs.Root
		value={data.type}
		class="flex items-center gap-4"
		onValueChange={handleTypeChange}
	>
		<div class="flex items-center gap-4">
			<Button
				title="Create category"
				autofocus
				variant="outline"
				onclick={handleClickCreate}>Create Category</Button
			>
			<Tabs.List>
				<Tabs.Trigger value="expense">Expense</Tabs.Trigger>
				<Tabs.Trigger value="income">Income</Tabs.Trigger>
			</Tabs.List>
		</div>
	</Tabs.Root>

	{#each data.nestedCategories as category}
		<Card.Root class="w-full">
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
						<div class="flex gap-2">
							{#each category.children as subcategory}
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
				<div>
					<Button
						title="Edit category"
						size="icon"
						variant="ghost"
						onclick={() => handleClickEdit(category)}
					>
						<Pencil />
					</Button>
					<ConfirmDialog
						title="Are you sure?"
						description="Are you sure you want to delete this category?"
						formProps={{
							action: `?/delete-category&id=${category.id}`,
							method: "post",
						}}
					>
						{#snippet triggerChild({ props })}
							<Button
								title="Delete category"
								variant="ghost"
								class="size-8 p-0 [&_svg]:size-3.5"
								{...props}
							>
								<Trash />
							</Button>
						{/snippet}
					</ConfirmDialog>
				</div>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
