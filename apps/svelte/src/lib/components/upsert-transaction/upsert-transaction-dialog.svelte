<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { NestedCategories } from "$lib/utils/category";
	import UpsertTransactionForm from "./upsert-transaction-form.svelte";

	let {
		wallets,
		categories,
	}: {
		wallets: Array<{ id: number; name: string }>;
		categories: NestedCategories;
	} = $props();
</script>

<Dialog.Root>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}
		>Create Transaction</Dialog.Trigger
	>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create Transaction</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root value="expense">
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense">Expense</Tabs.Trigger>
				<Tabs.Trigger value="income">Income</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="expense">
				<UpsertTransactionForm {categories} {wallets} />
			</Tabs.Content>
			<Tabs.Content value="income">TODO: Income</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
