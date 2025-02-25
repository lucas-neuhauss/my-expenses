<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Tabs from "$lib/components/ui/tabs";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import type { NestedCategory } from "$lib/utils/category";
	import UpsertTransactionForm from "./upsert-transaction-form.svelte";

	let {
		open = $bindable(),
		transaction = $bindable(),
		categories,
		wallets,
		defaultWallet,
		defaultCategory,
	}: {
		open: boolean;
		transaction: DashboardTransaction | null;
		wallets: Array<{ id: number; name: string }>;
		categories: NestedCategory[];
		defaultWallet: number;
		defaultCategory: number;
	} = $props();
	let isUpdate = $derived(transaction !== null);

	let tab = $state<"expense" | "income" | "transference">("expense");
	let tabsDisabled = $derived(!!transaction);

	$effect(() => {
		if (open && !!transaction) {
			if (transaction.transferenceId !== null) {
				tab = "transference";
			} else {
				tab = transaction.type;
			}
		}
	});

	const onSuccess = (shouldContinue = false) => {
		if (!shouldContinue) {
			open = false;
		}
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>
				{isUpdate ? "Update Transaction" : "Create Transaction"}
			</Dialog.Title>
		</Dialog.Header>

		<Tabs.Root bind:value={tab}>
			<Tabs.List class="w-full [&_button]:w-full">
				<Tabs.Trigger value="expense" disabled={tabsDisabled}>Expense</Tabs.Trigger>
				<Tabs.Trigger value="income" disabled={tabsDisabled}>Income</Tabs.Trigger>
				<Tabs.Trigger value="transference" disabled={tabsDisabled || wallets.length < 2}>
					Transference
				</Tabs.Trigger>
			</Tabs.List>
			<Tabs.Content value="expense">
				{#snippet child({ props })}
					<div {...props} tabindex="-1">
						<UpsertTransactionForm
							{transaction}
							categories={categories.filter((c) => c.type === "expense")}
							{wallets}
							{tab}
							{defaultCategory}
							{defaultWallet}
							{onSuccess}
						/>
					</div>
				{/snippet}
			</Tabs.Content>
			<Tabs.Content value="income">
				{#snippet child({ props })}
					<div {...props} tabindex="-1">
						<UpsertTransactionForm
							{transaction}
							categories={categories.filter((c) => c.type === "income")}
							{wallets}
							{tab}
							{defaultCategory}
							{defaultWallet}
							{onSuccess}
						/>
					</div>
				{/snippet}
			</Tabs.Content>
			<Tabs.Content value="transference">
				{#snippet child({ props })}
					{#if wallets.length >= 2}
						<div {...props} tabindex="-1">
							<UpsertTransactionForm
								{transaction}
								categories={categories.filter((c) => c.type === "income")}
								{wallets}
								{tab}
								{defaultCategory}
								{defaultWallet}
								{onSuccess}
							/>
						</div>
					{/if}
				{/snippet}
			</Tabs.Content>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
