<script lang="ts">
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { buttonVariants } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import * as Tooltip from "$lib/components/ui/tooltip";
	import { UpsertTransaction } from "$lib/components/upsert-transaction";
	import { formatCurrency } from "$lib/currency";
	import { DateFormatter } from "@internationalized/date";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";

	let { data } = $props();
	let month = $state(String(data.month));

	const monthOptions = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	].map((month, i) => ({ value: String(i + 1), label: month }));
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

	<div class="flex items-center gap-4">
		<UpsertTransaction wallets={data.wallets} categories={data.categories} />

		<Select.Root
			type="single"
			name="wallet"
			bind:value={month}
			onValueChange={(v) => goto(`/?month=${v}`)}
		>
			{@const selectedMonth = monthOptions.find((mo) => mo.value === month)!}
			<Select.Trigger class="col-span-3 w-[115px]">{selectedMonth.label}</Select.Trigger>
			<Select.Content>
				{#each monthOptions as option}
					<Select.Item value={String(option.value)}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

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
				{#each data.transactions as t (t.id)}
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
										class: "size-8 p-0 [&_svg]:size-3.5",
									})}
								>
									<Pencil />
								</Tooltip.Trigger>
								<Tooltip.Content>
									<p>Edit transaction</p>
								</Tooltip.Content>
							</Tooltip.Root>

							<form
								use:enhance
								action={`?/delete-transaction&id=${t.id}`}
								method="post"
								class="inline-flex"
							>
								<Tooltip.Root>
									<Tooltip.Trigger
										type="submit"
										aria-label="Delete transaction"
										class={buttonVariants({
											variant: "ghost",
											class: "size-8 p-0 [&_svg]:size-3.5",
										})}
									>
										<Trash />
									</Tooltip.Trigger>
									<Tooltip.Content>
										<p>Delete transaction</p>
									</Tooltip.Content>
								</Tooltip.Root>
							</form>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
