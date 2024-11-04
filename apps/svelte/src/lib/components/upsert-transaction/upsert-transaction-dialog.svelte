<script lang="ts">
	import { page } from "$app/stores";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import type { NestedCategories } from "$lib/utils/category";
	import UpsertTransactionForm from "./upsert-transaction-form.svelte";

	let {
		wallets,
		categories,
		transaction = null,
		onClose,
	}: {
		transaction: DashboardTransaction | null;
		wallets: Array<{ id: number; name: string }>;
		categories: NestedCategories;
		onClose: () => void;
	} = $props();

	let tab = $state<"expense" | "income">("expense");
	let open = $state(false);
	let tabsDisabled = $derived(!!transaction);

	$effect(() => {
		if (transaction) {
			open = true;
		}
	});

	$effect(() => {
		if ($page.form && $page.form.ok) {
			open = false;
		}
	});
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (!isOpen) {
			onClose();
		}
		open = isOpen;
	}}
>
	<Dialog.Trigger class={buttonVariants({ variant: "outline" })}>
		Create Transaction
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create Transaction</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root bind:value={tab}>
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense" disabled={tabsDisabled}>Expense</Tabs.Trigger>
				<Tabs.Trigger value="income" disabled={tabsDisabled}>Income</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="expense">
				<UpsertTransactionForm
					{transaction}
					categories={categories.filter((c) => c.type === "expense")}
					{wallets}
					{tab}
				/>
			</Tabs.Content>
			<Tabs.Content value="income">
				<UpsertTransactionForm
					{transaction}
					categories={categories.filter((c) => c.type === "income")}
					{wallets}
					{tab}
				/>
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
