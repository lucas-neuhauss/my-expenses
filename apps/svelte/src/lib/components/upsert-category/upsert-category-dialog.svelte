<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { NestedCategory } from "$lib/utils/category";
	import UpsertCategoryForm from "./upsert-category-form.svelte";

	let {
		open = $bindable(),
		category = $bindable(),
	}: {
		open: boolean;
		category: NestedCategory | null;
	} = $props();
	let isUpdate = $derived(category !== null);
	let tab = $state<"expense" | "income">("expense");

	const onSuccess = () => {
		open = false;
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>
				{isUpdate ? "Update Category" : "Create Category"}
			</Dialog.Title>
		</Dialog.Header>
		<Tabs.Root bind:value={tab}>
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense">Expense</Tabs.Trigger>
				<Tabs.Trigger value="income">Income</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="expense">
				{#snippet child({ props })}
					<div {...props} tabindex="-1">
						<UpsertCategoryForm type="expense" {category} {onSuccess} />
					</div>
				{/snippet}
			</Tabs.Content>
			<Tabs.Content value="income">
				{#snippet child({ props })}
					<div {...props} tabindex="-1">
						<UpsertCategoryForm type="income" {category} {onSuccess} />
					</div>
				{/snippet}
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
