<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import CategoriesCombobox from "$lib/components/categories-combobox.svelte";
	import ConfirmDialog from "$lib/components/confirm-dialog.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import { UpsertTransaction } from "$lib/components/upsert-transaction";
	import { formatCurrency } from "$lib/currency";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import { DateFormatter } from "@internationalized/date";
	import { getLocalDate } from "$lib/utils/date-time";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";

	let { data } = $props();
	let wallet = $state(String(data.wallet));
	let category = $state(data.category);
	let month = $state(String(data.month));
	let year = $state(String(data.year));
	let upsertDialog = $state<{
		open: boolean;
		transaction: DashboardTransaction | null;
	}>({
		open: false,
		transaction: null,
	});

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
	const yearOptions = Array.from({ length: 100 }, (_, i) => ({
		label: String(new Date().getFullYear() - i),
		value: String(new Date().getFullYear() - i),
	}));
	const currentYear = String(new Date().getFullYear());
	const currentMonth = String(new Date().getMonth() + 1);

	const onWalletChange = (id: string) => {
		const url = new URL($page.url.href);

		if (id === "-1") {
			url.searchParams.delete("wallet");
		} else {
			url.searchParams.set("wallet", id);
		}
		goto(url.href);
	};
	const onMonthChanged = (m: string) => {
		const url = new URL($page.url.href);
		if (year === currentYear && month === currentMonth) {
			url.searchParams.delete("month");
			url.searchParams.delete("year");
		} else {
			url.searchParams.set("month", m);
		}
		goto(url.href);
	};
	const onYearChanged = (y: string) => {
		const url = new URL($page.url.href);
		if (year === currentYear) {
			url.searchParams.delete("year");
			if (month === currentMonth) {
				url.searchParams.delete("month");
			}
		} else {
			url.searchParams.set("month", month);
			url.searchParams.set("year", y);
		}
		goto(url.href);
	};
	const onCategoryChanged = (c: number) => {
		const url = new URL($page.url.href);
		if (c === -1) {
			url.searchParams.delete("category");
		} else {
			url.searchParams.set("category", String(c));
		}
		goto(url.href);
	};

	const handleClickCreate = () => {
		upsertDialog = {
			open: true,
			transaction: null,
		};
	};

	const handleClickEdit = (transaction: DashboardTransaction) => {
		upsertDialog = {
			open: true,
			transaction,
		};
	};
</script>

<svelte:head>
	<title>Home - My Expenses</title>
</svelte:head>

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
		<Button variant="outline" onclick={handleClickCreate}>Create Transaction</Button>
		<UpsertTransaction
			bind:open={upsertDialog.open}
			bind:transaction={upsertDialog.transaction}
			wallets={data.wallets}
			categories={data.categories}
		/>

		<Select.Root
			type="single"
			name="wallet"
			bind:value={wallet}
			onValueChange={onWalletChange}
			allowDeselect={false}
		>
			{@const walletOptions = [{ id: -1, name: "All Wallets" }, ...data.wallets]}
			{@const selectedWallet = walletOptions.find((w) => String(w.id) === wallet)!}
			<Select.Trigger class="col-span-3 w-[115px]">{selectedWallet.name}</Select.Trigger>
			<Select.Content>
				{#each walletOptions as w}
					<Select.Item value={String(w.id)}>{w.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<CategoriesCombobox
			categories={data.categories}
			value={category}
			onChange={onCategoryChanged}
			includeAllCategoriesOption
			width="220px"
		/>

		<Select.Root
			type="single"
			name="month"
			bind:value={month}
			onValueChange={onMonthChanged}
			allowDeselect={false}
		>
			{@const selectedMonth = monthOptions.find((mo) => mo.value === month)!}
			<Select.Trigger class="col-span-3 w-[115px]">{selectedMonth.label}</Select.Trigger>
			<Select.Content>
				{#each monthOptions as option}
					<Select.Item value={String(option.value)}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<Select.Root
			type="single"
			name="year"
			bind:value={year}
			onValueChange={onYearChanged}
			allowDeselect={false}
		>
			{@const selectedYear = yearOptions.find((y) => y.value === year)!}
			<Select.Trigger class="col-span-3 w-[115px]">{selectedYear.label}</Select.Trigger>
			<Select.Content>
				{#each yearOptions as option}
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
						<Table.Cell class="font-medium">
							{new DateFormatter("en-US", { dateStyle: "medium" }).format(
								getLocalDate(t.date),
							)}
						</Table.Cell>
						<Table.Cell>{t.description}</Table.Cell>
						<Table.Cell class="inline-flex items-center gap-x-2">
							<div class="flex items-center justify-center rounded-full bg-card p-2">
								<img
									alt="category icon"
									src={`/images/category/${t.category.icon}`}
									width="15"
									height="15"
								/>
							</div>
							{t.category.name}
						</Table.Cell>
						<Table.Cell>
							{t.wallet.name}
						</Table.Cell>
						<Table.Cell>{formatCurrency(t.cents)}</Table.Cell>
						<Table.Cell class="flex items-center gap-2">
							<Button
								title="Edit transaction"
								aria-label="Edit transaction"
								variant="ghost"
								class="size-8 p-0 [&_svg]:size-3.5"
								onclick={() => handleClickEdit(t)}
							>
								<Pencil />
							</Button>

							<ConfirmDialog
								title="Are you sure?"
								description="Are you sure you want to delete this transaction?"
								formProps={{
									action: `?/delete-transaction&id=${t.id}`,
									method: "post",
								}}
							>
								{#snippet triggerChild({ props })}
									<Button
										title="Delete transaction"
										aria-label="delete transaction"
										variant="ghost"
										class="size-8 p-0 [&_svg]:size-3.5"
										{...props}
									>
										<Trash />
									</Button>
								{/snippet}
							</ConfirmDialog>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
