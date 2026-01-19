<script lang="ts">
	import CategoriesCombobox from "$lib/components/categories-combobox.svelte";
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import DashboardCharts from "$lib/components/dashboard-charts.svelte";
	import SavingsIllustration from "$lib/components/illustrations/savings-illustration.svelte";
	import MoneyCardSkeleton from "$lib/components/skeletons/money-card-skeleton.svelte";
	import TransactionTableSkeleton from "$lib/components/skeletons/transaction-table-skeleton.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import { UpsertTransaction } from "$lib/components/upsert-transaction";
	import { formatCurrency } from "$lib/currency";
	import { categoryCollection } from "$lib/db-collectons/category-collection";
	import { walletCollection } from "$lib/db-collectons/wallet-collection";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import { nestCategories } from "$lib/utils/category";
	import { getLocalDate, MONTHS } from "$lib/utils/date-time";
	import { calculateDashboardData } from "$lib/utils/transaction";
	import { DateFormatter } from "@internationalized/date";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Trash from "@lucide/svelte/icons/trash";
	import { isNull, useLiveQuery } from "@tanstack/svelte-db";
	import { parseAsBoolean, parseAsInteger, useQueryState } from "nuqs-svelte";
	import { toast } from "svelte-sonner";
	import { buildBalanceQuery, buildTransactionsQuery } from "./lib";
	import { transactionCollection } from "$lib/db-collectons/transaction-collection";
	import { isQueryCacheHydrated } from "$lib/integrations/tanstack-query/query-client";

	let { form } = $props();

	$effect(() => {
		if (typeof form?.toast === "string") {
			toast.success(form.toast);
		}
	});

	let upsertDialog = $state<{
		open: boolean;
		transaction: DashboardTransaction | null;
	}>({
		open: false,
		transaction: null,
	});
	let deleteDialog = $state<{ open: boolean; transactionId: number | null }>({
		open: false,
		transactionId: null,
	});

	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	// Search params state
	const paid = useQueryState("paid", parseAsBoolean);
	const wallet = useQueryState("wallet", parseAsInteger.withDefault(-1));
	const category = useQueryState("category", parseAsInteger.withDefault(-1));
	const month = useQueryState("month", parseAsInteger.withDefault(currentMonth));
	const year = useQueryState("year", parseAsInteger.withDefault(currentYear));

	const { allTransactions, filteredTransactions } = $derived(
		buildTransactionsQuery({
			paid: paid.current,
			wallet: wallet.current,
			month: month.current,
			year: year.current,
			category: category.current,
		}),
	);
	const allTransactionsQuery = useLiveQuery((q) =>
		q.from({ transaction: allTransactions }),
	);
	const filteredTransactionsQuery = useLiveQuery((q) =>
		q
			.from({ transaction: filteredTransactions })
			.orderBy(({ transaction }) => transaction.date, "desc")
			.orderBy(({ transaction }) => transaction.id, "desc"),
	);
	const balanceQuery = useLiveQuery((q) =>
		q
			.from({ balance: buildBalanceQuery({ month: month.current, year: year.current }) })
			.findOne(),
	);
	const categoriesQuery = useLiveQuery((q) =>
		q
			.from({ c: categoryCollection })
			.where(({ c }) => isNull(c.unique))
			.orderBy(({ c }) => c.parentId, "desc")
			.orderBy(({ c }) => c.name, "asc"),
	);
	const walletsQuery = useLiveQuery((q) => q.from({ wallet: walletCollection }));

	let balance = $derived(
		(balanceQuery.data?.sum ?? 0) +
			walletsQuery.data.reduce((acc, w) => acc + w.initialBalance, 0),
	);
	let { totalIncome, totalExpense, filteredIncome, filteredExpense, charts } = $derived(
		calculateDashboardData(allTransactionsQuery.data, wallet.current, category.current),
	);
	let nestedCategories = $derived(nestCategories(categoriesQuery.data));

	let isLoading = $derived(
		!$isQueryCacheHydrated ||
			!balanceQuery.isReady ||
			!walletsQuery.isReady ||
			!allTransactionsQuery.isReady ||
			!filteredTransactionsQuery.isReady,
	);

	const monthOptions = MONTHS.map((month, i) => ({ value: i + 1, label: month }));
	const yearOptions = Array.from({ length: 50 }, (_, i) => ({
		label: String(new Date().getFullYear() - i + 25),
		value: new Date().getFullYear() - i + 25,
	}));

	let walletOptions = $derived([{ id: -1, name: "All Wallets" }, ...walletsQuery.data]);
	let selectedWallet = $derived(walletOptions.find((w) => w.id === wallet.current));
	let selectedMonth = $derived(monthOptions.find((mo) => mo.value === month.current)!);
	let selectedYear = $derived(yearOptions.find((y) => y.value === year.current)!);

	const onWalletChange = (id: string) => {
		if (id === "-1") {
			wallet.set(() => null);
		} else {
			wallet.set(() => parseInt(id));
		}
	};

	const onStatusChange = (id: string) => {
		if (id === "all") {
			paid.set(null);
		} else {
			paid.set(id === "paid");
		}
	};

	const onDateChanged = (m: number, y: number) => {
		if (m === 0) {
			m = 12;
			y -= 1;
		} else if (m === 13) {
			m = 1;
			y += 1;
		}

		let _year: number | null = null;
		let _month: number | null = null;
		if (y !== currentYear) {
			_year = y;
		}
		if (m !== currentMonth || y !== currentYear) {
			_month = m;
		}
		year.set(() => _year);
		month.set(() => _month);
	};

	const onCategoryChanged = (c: number) => {
		if (c === -1) {
			category.set(() => null);
		} else {
			category.set(() => c);
		}
	};

	const handleChartCategoryClick = (categoryId: number) => {
		// Toggle category filter: if already selected, clear it; otherwise set it
		if (category.current === categoryId) {
			category.set(() => null);
		} else {
			category.set(() => categoryId);
		}
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
	<Card.Root class="w-50 gap-0 p-0">
		<Card.Header class="p-5 pb-0">
			<Card.Title>{label}</Card.Title>
		</Card.Header>
		<Card.Content class="px-5 pt-3 pb-4">
			<p>{formatCurrency(value)}</p>
		</Card.Content>
	</Card.Root>
{/snippet}

<ConfirmDialog
	open={deleteDialog.open}
	title="Are you sure?"
	description="Are you sure you want to delete this transaction?"
	remoteCommand={() => {
		if (!deleteDialog.transactionId) return;
		const tx = transactionCollection.delete(deleteDialog.transactionId);
		tx.isPersisted.promise.then(() => (deleteDialog.open = false));
	}}
/>

<div class="flex flex-col items-start gap-y-3 px-4 pb-10">
	{#if isLoading}
		<MoneyCardSkeleton />
	{:else}
		<div class="flex flex-wrap justify-center gap-4 sm:justify-start">
			{@render MoneyCard("Month-end balance", balance)}
			{@render MoneyCard("Month Income", totalIncome)}
			{@render MoneyCard("Month Expense", totalExpense)}

			<Card.Root class="w-50 gap-0 p-0">
				<Card.Content
					class="flex h-full flex-col items-start justify-center gap-1 px-5 py-2 text-sm"
				>
					<p>
						Out: {formatCurrency(filteredExpense)}
					</p>
					<p>
						In: {formatCurrency(filteredIncome)}
					</p>
					<p>Total: {formatCurrency(filteredIncome + filteredExpense)}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-4">
		<Button autofocus variant="outline" onclick={handleClickCreate}>
			Create Transaction
		</Button>
		<UpsertTransaction
			bind:open={upsertDialog.open}
			bind:transaction={upsertDialog.transaction}
			wallets={walletsQuery.data}
			categories={nestedCategories}
			defaultWallet={wallet.current}
			defaultCategory={category.current}
		/>

		<Select.Root
			type="single"
			name="wallet"
			value={String(wallet)}
			onValueChange={onWalletChange}
			allowDeselect={false}
		>
			<Select.Trigger title="Select wallet" class="col-span-3 w-42.5">
				{selectedWallet ? selectedWallet.name : "..."}
			</Select.Trigger>
			<Select.Content>
				{#each walletOptions as w (w.id)}
					<Select.Item value={String(w.id)}>{w.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<CategoriesCombobox
			categories={nestedCategories}
			value={category.current}
			onChange={onCategoryChanged}
			includeAllCategoriesOption
			style="width: 224px;"
		/>

		<Select.Root
			type="single"
			name="paid"
			value={String(paid.current)}
			onValueChange={onStatusChange}
		>
			<Select.Trigger title="Select paid" class="col-span-3 w-42.5">
				{paid.current === null ? "All Status" : paid.current ? "Paid" : "Not Paid"}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All</Select.Item>
				<Select.Item value="paid">Paid</Select.Item>
				<Select.Item value="not-paid">Not Paid</Select.Item>
			</Select.Content>
		</Select.Root>

		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon"
				class="shrink-0"
				title="Go to the previous month"
				aria-label="Go to the previous month"
				onclick={() => onDateChanged(month.current - 1, year.current)}
			>
				<ChevronLeft />
			</Button>

			<Select.Root
				type="single"
				name="month"
				value={String(month.current)}
				onValueChange={(m) => onDateChanged(Number(m), year.current)}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3 w-28.5">{selectedMonth.label}</Select.Trigger>
				<Select.Content>
					{#each monthOptions as option (option.value)}
						<Select.Item value={String(option.value)}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root
				type="single"
				name="year"
				value={String(year.current)}
				onValueChange={(y) => onDateChanged(month.current, Number(y))}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3 w-28.5">{selectedYear.label}</Select.Trigger>
				<Select.Content>
					{#each yearOptions as option (option.value)}
						<Select.Item value={String(option.value)}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Button
				variant="outline"
				size="icon"
				class="shrink-0"
				title="Go to the next month"
				aria-label="Go to the next month"
				onclick={() => onDateChanged(month.current + 1, year.current)}
			>
				<ChevronRight />
			</Button>
		</div>
	</div>

	<DashboardCharts {charts} onCategoryClick={handleChartCategoryClick} />

	{#if isLoading}
		<TransactionTableSkeleton />
	{:else if filteredTransactionsQuery.data.length === 0}
		<div class="mt-10 flex w-full flex-col items-center justify-center">
			<SavingsIllustration width={200} height="100%" />
			<p class="mt-6">You don't have transactions</p>
			<p>in this month yet</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-26.5">Date</Table.Head>
					<Table.Head>Description</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head>Wallet</Table.Head>
					<Table.Head>Amount</Table.Head>
					<Table.Head class="w-18">Paid</Table.Head>
					<Table.Head class="w-24">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each filteredTransactionsQuery.data as t (t.id)}
					<Table.Row>
						<Table.Cell>
							{new DateFormatter("en-US", { dateStyle: "medium" }).format(
								getLocalDate(t.date),
							)}
						</Table.Cell>
						<Table.Cell>
							{t.description}
							{#if t.installmentGroupId}
								<span class="text-muted-foreground ml-1 text-xs">
									[{t.installmentIndex}/{t.installmentTotal}]
								</span>
							{/if}
							{#if t.subscriptionId}
								<span
									class="bg-muted text-muted-foreground ml-1 rounded px-1.5 py-0.5 text-xs"
									title="Recurring subscription"
								>
									Recurring
								</span>
							{/if}
						</Table.Cell>
						<Table.Cell>
							<div class="flex h-full items-center gap-x-4">
								<img
									alt="category icon"
									src={`/images/category/${t.category.icon}`}
									width="19"
									height="19"
									loading="lazy"
								/>
								<span class="truncate">
									{t.category.name}
								</span>
							</div>
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
								onclick={() => handleClickEdit(t as DashboardTransaction)}
							>
								<Pencil />
							</Button>

							<Button
								title="Delete transaction"
								aria-label="delete transaction"
								variant="ghost"
								class="size-8 p-0 [&_svg]:size-3.5"
								onclick={() => (deleteDialog = { open: true, transactionId: t.id })}
							>
								<Trash />
							</Button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>
