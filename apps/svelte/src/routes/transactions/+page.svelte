<script lang="ts">
	import MultiCategoryCombobox from "$lib/components/multi-category-combobox.svelte";
	import SavingsIllustration from "$lib/components/illustrations/savings-illustration.svelte";
	import TransactionTableSkeleton from "$lib/components/skeletons/transaction-table-skeleton.svelte";
	import MoneyCardSkeleton from "$lib/components/skeletons/money-card-skeleton.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import { Input } from "$lib/components/ui/input";
	import { formatCurrency } from "$lib/currency";
	import { categoryCollection } from "$lib/db-collectons/category-collection";
	import { walletCollection } from "$lib/db-collectons/wallet-collection";
	import { isQueryCacheHydrated } from "$lib/integrations/tanstack-query/query-client";
	import { nestCategories } from "$lib/utils/category";
	import { getLocalDate } from "$lib/utils/date-time";
	import { DateFormatter } from "@internationalized/date";
	import ArrowRightLeft from "@lucide/svelte/icons/arrow-right-left";
	import ArrowUp from "@lucide/svelte/icons/arrow-up";
	import ArrowDown from "@lucide/svelte/icons/arrow-down";
	import Check from "@lucide/svelte/icons/check";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import X from "@lucide/svelte/icons/x";
	import { isNull, useLiveQuery } from "@tanstack/svelte-db";
	import {
		createPaginatedRowModel,
		createSortedRowModel,
		createTable,
		FlexRender,
		stockFeatures,
		tableFeatures,
	} from "@tanstack/svelte-table";
	import {
		parseAsArrayOf,
		parseAsBoolean,
		parseAsInteger,
		parseAsString,
		useQueryState,
	} from "nuqs-svelte";
	import { buildSearchQuery } from "./lib";

	// --- Search params state ---
	const search = useQueryState("search", parseAsString.withDefault(""));
	const dateFrom = useQueryState("dateFrom", parseAsString.withDefault(""));
	const dateTo = useQueryState("dateTo", parseAsString.withDefault(""));
	const categories = useQueryState(
		"categories",
		parseAsArrayOf(parseAsInteger).withDefault([]),
	);
	const wallet = useQueryState("wallet", parseAsInteger.withDefault(-1));
	const paid = useQueryState("paid", parseAsBoolean);

	// --- Debounced search state (local input, debounced to URL) ---
	let searchInput = $state(search.current);
	let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

	function onSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchInput = target.value;
		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search.set(() => target.value || null);
		}, 300);
	}

	// --- Base data queries ---
	const categoriesQuery = useLiveQuery((q) =>
		q
			.from({ c: categoryCollection })
			.where(({ c }) => isNull(c.unique))
			.orderBy(({ c }) => c.parentId, "desc")
			.orderBy(({ c }) => c.name, "asc"),
	);
	const walletsQuery = useLiveQuery((q) =>
		q.from({ wallet: walletCollection }).orderBy(({ wallet }) => wallet.name, "asc"),
	);

	let nestedCategories = $derived(nestCategories(categoriesQuery.data));

	// --- Transaction queries ---
	const { filteredTransactions } = $derived(
		buildSearchQuery({
			search: search.current,
			dateFrom: dateFrom.current,
			dateTo: dateTo.current,
			categories: categories.current,
			wallet: wallet.current,
			paid: paid.current,
		}),
	);

	const filteredTransactionsQuery = useLiveQuery((q) =>
		q
			.from({ transaction: filteredTransactions })
			.orderBy(({ transaction }) => transaction.date, "desc")
			.orderBy(({ transaction }) => transaction.id, "desc"),
	);

	// --- Aggregate summary (computed in JS) ---
	let totalIncome = $derived(
		filteredTransactionsQuery.data
			.filter((t) => t.type === "income")
			.reduce((acc, t) => acc + t.cents, 0),
	);
	let totalExpense = $derived(
		filteredTransactionsQuery.data
			.filter((t) => t.type === "expense")
			.reduce((acc, t) => acc + t.cents, 0),
	);
	let netBalance = $derived(totalIncome + totalExpense);

	// --- Derived state for selects ---
	let walletOptions = $derived([
		{ id: -1, name: "All Wallets" },
		...walletsQuery.data,
	]);

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

	let isLoading = $derived(
		!$isQueryCacheHydrated ||
			!categoriesQuery.isReady ||
			!walletsQuery.isReady ||
			!filteredTransactionsQuery.isReady,
	);

	// --- TanStack Table v9 setup ---
	const features = tableFeatures({
		...stockFeatures,
		sortedRowModel: createSortedRowModel(),
		paginatedRowModel: createPaginatedRowModel(),
	});

	const columns = [
		{ accessorKey: "date", header: "Date" },
		{ accessorKey: "description", header: "Description" },
		{
			id: "category",
			accessorFn: (row: { category: { name: string } }) => row.category.name,
			header: "Category",
		},
		{
			id: "wallet",
			accessorFn: (row: { wallet: { name: string } }) => row.wallet.name,
			header: "Wallet",
		},
		{ accessorKey: "cents", header: "Amount" },
		{ accessorKey: "paid", header: "Paid" },
	];

	const table = createTable({
		features,
		columns,
		get data() {
			return filteredTransactionsQuery.data;
		},
		initialState: {
			pagination: { pageIndex: 0, pageSize: 100 },
			sorting: [{ id: "date", desc: true }],
		},
	});
</script>

<svelte:head>
	<title>Search - My Expenses</title>
</svelte:head>

<div class="flex flex-col items-start gap-y-3 px-4 pb-10">
	<h1 class="text-2xl font-bold">Search Transactions</h1>

	<!-- Filters -->
	<div class="flex flex-wrap items-center gap-4">
		<!-- Text search (debounced) -->
		<Input
			type="text"
			placeholder="Search by description..."
			value={searchInput}
			oninput={onSearchInput}
			class="w-56"
		/>

		<!-- Date range -->
		<div class="flex items-center gap-2">
			<Input
				type="date"
				value={dateFrom.current}
				oninput={(e) =>
					dateFrom.set(() => (e.target as HTMLInputElement).value || null)
				}
				class="w-40"
				title="Start date"
			/>
			<span class="text-muted-foreground text-sm">to</span>
			<Input
				type="date"
				value={dateTo.current}
				oninput={(e) =>
					dateTo.set(() => (e.target as HTMLInputElement).value || null)
				}
				class="w-40"
				title="End date"
			/>
		</div>

		<!-- Multi-category -->
		<MultiCategoryCombobox
			value={categories.current}
			categories={nestedCategories}
			onChange={(ids) => categories.set(() => ids.length > 0 ? ids : null)}
			style="width: 224px;"
		/>

		<!-- Wallet -->
		<Select.Root
			type="single"
			name="wallet"
			value={String(wallet.current)}
			onValueChange={onWalletChange}
			allowDeselect={false}
		>
			<Select.Trigger title="Select wallet" class="w-42.5">
				{walletOptions.find((w) => w.id === wallet.current)?.name ?? "..."}
			</Select.Trigger>
			<Select.Content>
				{#each walletOptions as w (w.id)}
					<Select.Item value={String(w.id)}>{w.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<!-- Paid status -->
		<Select.Root
			type="single"
			name="paid"
			value={String(paid.current)}
			onValueChange={onStatusChange}
		>
			<Select.Trigger title="Select paid status" class="w-42.5">
				{paid.current === null ? "All Status" : paid.current ? "Paid" : "Not Paid"}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="all">All</Select.Item>
				<Select.Item value="paid">Paid</Select.Item>
				<Select.Item value="not-paid">Not Paid</Select.Item>
			</Select.Content>
		</Select.Root>
	</div>

	<!-- Summary Cards -->
	{#if isLoading}
		<MoneyCardSkeleton />
	{:else}
		<div class="flex flex-wrap justify-center gap-4 sm:justify-start">
			<Card.Root class="w-50 gap-0 p-0">
				<Card.Header class="p-5 pb-0">
					<Card.Title>Total Income</Card.Title>
				</Card.Header>
				<Card.Content class="px-5 pt-3 pb-4">
					<p>{formatCurrency(totalIncome)}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root class="w-50 gap-0 p-0">
				<Card.Header class="p-5 pb-0">
					<Card.Title>Total Expense</Card.Title>
				</Card.Header>
				<Card.Content class="px-5 pt-3 pb-4">
					<p>{formatCurrency(totalExpense)}</p>
				</Card.Content>
			</Card.Root>
			<Card.Root class="w-50 gap-0 p-0">
				<Card.Header class="p-5 pb-0">
					<Card.Title>Net Balance</Card.Title>
				</Card.Header>
				<Card.Content class="px-5 pt-3 pb-4">
					<p>{formatCurrency(netBalance)}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Results -->
	{#if isLoading}
		<TransactionTableSkeleton />
	{:else if filteredTransactionsQuery.data.length === 0}
		<div class="mt-10 flex w-full flex-col items-center justify-center">
			<SavingsIllustration width={200} height="100%" />
			<p class="text-muted-foreground mt-6">No transactions found</p>
			<p class="text-muted-foreground">
				{search.current ||
				dateFrom.current ||
				dateTo.current ||
				categories.current.length > 0 ||
				wallet.current > 0 ||
				paid.current !== null
					? "Try adjusting your filters"
					: "You don't have any transactions yet"}
			</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							{@const sorted = header.column.getIsSorted()}
							<Table.Head
								class={header.column.id === "date"
									? "w-26.5"
									: header.column.id === "paid"
										? "w-18"
										: ""}
							>
								{#if header.column.getCanSort()}
									<button
										class="inline-flex items-center gap-1"
										onclick={header.column.getToggleSortingHandler()}
									>
										<FlexRender header={header} />
										{#if sorted === "asc"}
											<ArrowUp class="size-3" />
										{:else if sorted === "desc"}
											<ArrowDown class="size-3" />
										{:else}
											<span class="size-3"></span>
										{/if}
									</button>
								{:else}
									<FlexRender header={header} />
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#each table.getRowModel().rows as row}
					{@const t = row.original}
					{@const isTransfer = t.transferenceId !== null}
					<Table.Row class={isTransfer ? "bg-muted/40" : ""}>
						<Table.Cell>
							{new DateFormatter("en-US", { dateStyle: "medium" }).format(
								getLocalDate(t.date),
							)}
						</Table.Cell>
						<Table.Cell>
							{t.description}
							{#if t.installmentGroupId}
								<span
									class="bg-muted text-muted-foreground ml-1 rounded px-1.5 py-0.5 text-xs"
									title="Installment {t.installmentIndex} of {t.installmentTotal}"
								>
									{t.installmentIndex}/{t.installmentTotal}
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
							{#if isTransfer}
								<div class="flex h-full items-center gap-x-2">
									<div class="text-muted-foreground [&_svg]:size-4">
										<ArrowRightLeft />
									</div>
									<span class="text-muted-foreground truncate">Transfer</span>
								</div>
							{:else}
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
							{/if}
						</Table.Cell>
						<Table.Cell>
							{#if isTransfer}
								<span class="text-muted-foreground">Transfer</span>
							{:else}
								{t.wallet.name}
							{/if}
						</Table.Cell>
						<Table.Cell>{formatCurrency(t.cents)}</Table.Cell>
						<Table.Cell>
							{#if t.paid}
								<span class="text-emerald-600 [&_svg]:size-4">
									<Check />
								</span>
							{:else}
								<span class="text-muted-foreground [&_svg]:size-4">
									<X />
								</span>
							{/if}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>

		<!-- Pagination -->
		{#if table.getPageCount() > 1}
			<div class="flex w-full items-center justify-between pt-4">
				<span class="text-muted-foreground text-sm">
					Showing {table.state.pagination.pageIndex * table.state.pagination.pageSize + 1}
					&ndash;
					{Math.min(
						(table.state.pagination.pageIndex + 1) * table.state.pagination.pageSize,
						table.getRowCount(),
					)}
					of {table.getRowCount()}
				</span>
				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						<ChevronLeft class="size-4" />
						Previous
					</Button>
					<span class="text-sm">
						Page {table.state.pagination.pageIndex + 1} of {table.getPageCount()}
					</span>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
						<ChevronRight class="size-4" />
					</Button>
				</div>
			</div>
		{/if}
	{/if}
</div>
