<script lang="ts">
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";
	import CategoriesCombobox from "$lib/components/categories-combobox.svelte";
	import ConfirmDialog from "$lib/components/confirm-dialog.svelte";
	import DashboardCharts from "$lib/components/dashboard-charts.svelte";
	import SavingsIllustration from "$lib/components/illustrations/savings-illustration.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import { UpsertTransaction } from "$lib/components/upsert-transaction";
	import { formatCurrency } from "$lib/currency";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import { getLocalDate, MONTHS } from "$lib/utils/date-time";
	import { DateFormatter } from "@internationalized/date";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash from "lucide-svelte/icons/trash";

	let { data } = $props();
	let upsertDialog = $state<{
		open: boolean;
		transaction: DashboardTransaction | null;
	}>({
		open: false,
		transaction: null,
	});
	const monthOptions = MONTHS.map((month, i) => ({ value: i + 1, label: month }));
	const yearOptions = Array.from({ length: 100 }, (_, i) => ({
		label: String(new Date().getFullYear() - i),
		value: new Date().getFullYear() - i,
	}));

	let walletOptions = $derived([{ id: -1, name: "All Wallets" }, ...data.wallets]);
	let selectedWallet = $derived(walletOptions.find((w) => w.id === data.wallet)!);
	let selectedMonth = $derived(monthOptions.find((mo) => mo.value === data.month)!);
	let selectedYear = $derived(yearOptions.find((y) => y.value === data.year)!);

	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

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
		if (data.year === currentYear && Number(m) === currentMonth) {
			url.searchParams.delete("month");
			url.searchParams.delete("year");
		} else {
			url.searchParams.set("month", m);
		}
		goto(url.href);
	};
	const onYearChanged = (y: string) => {
		const url = new URL($page.url.href);
		if (Number(y) === currentYear) {
			url.searchParams.delete("year");
			if (data.month === currentMonth) {
				url.searchParams.delete("month");
			}
		} else {
			url.searchParams.set("month", String(data.month));
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
		<Button autofocus variant="outline" onclick={handleClickCreate}
			>Create Transaction</Button
		>
		<UpsertTransaction
			bind:open={upsertDialog.open}
			bind:transaction={upsertDialog.transaction}
			wallets={data.wallets}
			categories={data.categories}
			defaultWallet={data.wallet}
			defaultCategory={data.category}
		/>

		<Select.Root
			type="single"
			name="wallet"
			value={String(data.wallet)}
			onValueChange={onWalletChange}
			allowDeselect={false}
		>
			<Select.Trigger class="col-span-3 min-w-[115px]">
				{selectedWallet.name}
			</Select.Trigger>
			<Select.Content>
				{#each walletOptions as w}
					<Select.Item value={String(w.id)}>{w.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<CategoriesCombobox
			categories={data.categories}
			value={data.category}
			onChange={onCategoryChanged}
			includeAllCategoriesOption
			style="min-width: 224px;"
		/>

		<Select.Root
			type="single"
			name="month"
			value={String(data.month)}
			onValueChange={onMonthChanged}
			allowDeselect={false}
		>
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
			value={String(data.year)}
			onValueChange={onYearChanged}
			allowDeselect={false}
		>
			<Select.Trigger class="col-span-3 w-[115px]">{selectedYear.label}</Select.Trigger>
			<Select.Content>
				{#each yearOptions as option}
					<Select.Item value={String(option.value)}>{option.label}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>
	</div>

	<DashboardCharts charts={data.charts} />

	{#if data.transactions.length > 0}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[104px]">Date</Table.Head>
					<Table.Head>Description</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head>Wallet</Table.Head>
					<Table.Head>Amount</Table.Head>
					<Table.Head class="w-[72px]">Paid</Table.Head>
					<Table.Head class="w-[96px]">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each data.transactions as t (t.id)}
					<Table.Row>
						<Table.Cell>
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
						<Table.Cell>{t.paid ? "✔️" : "🚫"}</Table.Cell>
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
	{:else}
		<div class="mt-10 flex w-full flex-col items-center justify-center">
			<SavingsIllustration width={200} height="100%" />
			<p class="mt-6">You don't have transactions</p>
			<p>in this month yet</p>
		</div>
	{/if}
</div>
