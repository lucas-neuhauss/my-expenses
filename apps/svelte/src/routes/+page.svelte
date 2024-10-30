<script lang="ts">
	import { DateFormatter } from "@internationalized/date";
	import { formatCurrency } from "$lib/currency";
	import * as Table from "$lib/components/ui/table";
	import UpsertTransactionDialog from "$lib/components/upsert-transaction-dialog.svelte";
	import * as Card from "$lib/components/ui/card";
	import { buttonVariants } from "$lib/components/ui/button";
	import Trash from "lucide-svelte/icons/trash";
	import Pencil from "lucide-svelte/icons/pencil";
	import * as Tooltip from "$lib/components/ui/tooltip";

	let { data } = $props();
</script>

{#snippet MoneyCard(label: string, value: number)}
	<Card.Root class="w-[200px]">
		<Card.Header class="p-5 pb-0">
			<Card.Title>{label}</Card.Title>
		</Card.Header>
		<Card.Content class="p-5 pt-3">
			<p>{formatCurrency(value)}</p>
		</Card.Content>
	</Card.Root>
{/snippet}

<div class="flex flex-col items-start gap-y-3 px-4 pb-4">
	<div class="flex gap-4">
		{@render MoneyCard("Current balance", data.balance)}
		{@render MoneyCard("Income", data.totalIncome)}
		{@render MoneyCard("Expense", data.totalExpense)}
	</div>

	<UpsertTransactionDialog />

	{#if data.transactions.length > 0}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[100px]">Date</Table.Head>
					<Table.Head>Description</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head>Wallet</Table.Head>
					<Table.Head>Amount</Table.Head>
					<Table.Head>Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.transactions as t}
					<Table.Row>
						<Table.Cell class="font-medium"
							>{new DateFormatter("en-US").format(t.timestamp)}
						</Table.Cell>
						<Table.Cell>{t.description}</Table.Cell>
						<Table.Cell class="inline-flex items-center gap-x-2">
							<div class="flex items-center justify-center rounded-full bg-card p-2">
								<img
									alt="category icon"
									src={`/images/category/${t.category.iconName}`}
									width="15"
									height="15"
								/>
							</div>
							{t.category.title}
						</Table.Cell>
						<Table.Cell>
							{t.wallet.name}
						</Table.Cell>
						<Table.Cell>{formatCurrency(t.cents)}</Table.Cell>
						<Table.Cell>
							<Tooltip.Root>
								<Tooltip.Trigger
									aria-label="Edit transaction"
									class={buttonVariants({
										variant: "secondary",
										class: "size-8 [&_svg]:size-3.5",
									})}
								>
									<Pencil />
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>Edit transaction</p>
								</Tooltip.Content>
							</Tooltip.Root>

							<Tooltip.Root>
								<Tooltip.Trigger
									aria-label="Delete transaction"
									class={buttonVariants({
										variant: "ghost",
										class: "size-8 [&_svg]:size-3.5",
									})}
								>
									<Trash />
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>Delete transaction</p>
								</Tooltip.Content>
							</Tooltip.Root>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
