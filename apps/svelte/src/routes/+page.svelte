<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import CategoriesCombobox from "$lib/components/categories-combobox.svelte";
	import ConfirmDialog from "$lib/components/confirm-dialog-remote.svelte";
	import DashboardCharts from "$lib/components/dashboard-charts.svelte";
	import SavingsIllustration from "$lib/components/illustrations/savings-illustration.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Card from "$lib/components/ui/card";
	import * as Select from "$lib/components/ui/select";
	import * as Table from "$lib/components/ui/table";
	import { UpsertTransaction } from "$lib/components/upsert-transaction";
	import { formatCurrency } from "$lib/currency";
	import { deleteTransactionAction } from "$lib/remote/transaction.remote.js";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import { getLocalDate, MONTHS } from "$lib/utils/date-time";
	import { DateFormatter } from "@internationalized/date";
	import ChevronLeft from "@lucide/svelte/icons/chevron-left";
	import ChevronRight from "@lucide/svelte/icons/chevron-right";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Trash from "@lucide/svelte/icons/trash";
	import { toast } from "svelte-sonner";
	import { parseAsBoolean, parseAsInteger, useQueryState } from "nuqs-svelte";
	import { useLiveQuery } from "@tanstack/svelte-db";
	import { buildTransactionsQuery } from "./lib";

	let { data, form } = $props();

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
	let deleteDialog = $state<{ open: boolean; transaction: DashboardTransaction | null }>({
		open: false,
		transaction: null,
	});

	const currentYear = new Date().getFullYear();
	const currentMonth = new Date().getMonth() + 1;

	// Search params state
	const paid = useQueryState("paid", parseAsBoolean);
	const wallet = useQueryState("wallet", parseAsInteger.withDefault(-1));
	const category = useQueryState("category", parseAsInteger.withDefault(-1));
	const month = useQueryState("month", parseAsInteger.withDefault(currentMonth));
	const year = useQueryState("year", parseAsInteger.withDefault(currentYear));

	const query = useLiveQuery((q) =>
		q
			.from({
				transaction: buildTransactionsQuery({
					paid: paid.current,
					wallet: wallet.current,
					month: month.current,
					year: year.current,
					category: category.current,
				}),
			})
			.orderBy(({ transaction }) => transaction.date, "desc")
			.orderBy(({ transaction }) => transaction.id, "desc"),
	);

	const monthOptions = MONTHS.map((month, i) => ({ value: i + 1, label: month }));
	const yearOptions = Array.from({ length: 50 }, (_, i) => ({
		label: String(new Date().getFullYear() - i + 25),
		value: new Date().getFullYear() - i + 25,
	}));

	let walletOptions = $derived([{ id: -1, name: "All Wallets" }, ...data.wallets]);
	let selectedWallet = $derived(walletOptions.find((w) => w.id === wallet.current)!);
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
	<Card.Root class="w-[200px] gap-0 p-0">
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
	remoteCommand={async () => {
		if (!deleteDialog.transaction) return;
		try {
			const res = await deleteTransactionAction(deleteDialog.transaction.id);
			if (!res) throw Error();
			if (res.ok) {
				toast.success(res.toast);
				deleteDialog.open = false;
				invalidateAll();
			} else {
				toast.error(res.toast);
			}
		} catch {
			toast.error("Something went wrong. Please try again later.");
		}
	}}
/>

<div class="flex flex-col items-start gap-y-3 px-4 pb-10">
	<div class="flex flex-wrap justify-center gap-4 sm:justify-start">
		{@render MoneyCard("Month-end balance", data.balance)}
		{@render MoneyCard("Month Income", data.totalIncome)}
		{@render MoneyCard("Month Expense", data.totalExpense)}

		<Card.Root class="w-50 gap-0 p-0">
			<Card.Content
				class="flex h-full flex-col items-start justify-center gap-1 px-5 py-2 text-sm"
			>
				<p>
					Out: {formatCurrency(data.filteredExpense)}
				</p>
				<p>
					In: {formatCurrency(data.filteredIncome)}
				</p>
				<p>Total: {formatCurrency(data.filteredIncome + data.filteredExpense)}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="flex flex-wrap items-center gap-4">
		<Button autofocus variant="outline" onclick={handleClickCreate}>
			Create Transaction
		</Button>
		<UpsertTransaction
			bind:open={upsertDialog.open}
			bind:transaction={upsertDialog.transaction}
			wallets={data.wallets}
			categories={data.categories}
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
			<Select.Trigger title="Select wallet" class="col-span-3 w-[170px]">
				{selectedWallet.name}
			</Select.Trigger>
			<Select.Content>
				{#each walletOptions as w (w.id)}
					<Select.Item value={String(w.id)}>{w.name}</Select.Item>
				{/each}
			</Select.Content>
		</Select.Root>

		<CategoriesCombobox
			categories={data.categories}
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
			<Select.Trigger title="Select paid" class="col-span-3 w-[170px]">
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
				<Select.Trigger class="col-span-3 w-[115px]">{selectedMonth.label}</Select.Trigger
				>
				<Select.Content>
					{#each monthOptions as option (option.value)}
						<Select.Item value={String(option.value)}>{option.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Select.Root
				type="single"
				name="year"
				value={String(data.year)}
				onValueChange={(y) => onDateChanged(data.month, Number(y))}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3 w-[115px]">{selectedYear.label}</Select.Trigger>
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
				onclick={() => onDateChanged(data.month + 1, data.year)}
			>
				<ChevronRight />
			</Button>
		</div>
	</div>

	<DashboardCharts charts={data.charts} />

	{#if query.isReady && query.data.length === 0}
		<div class="mt-10 flex w-full flex-col items-center justify-center">
			<SavingsIllustration width={200} height="100%" />
			<p class="mt-6">You don't have transactions</p>
			<p>in this month yet</p>
		</div>
	{:else}
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[107px]">Date</Table.Head>
					<Table.Head>Description</Table.Head>
					<Table.Head>Category</Table.Head>
					<Table.Head>Wallet</Table.Head>
					<Table.Head>Amount</Table.Head>
					<Table.Head class="w-18">Paid</Table.Head>
					<Table.Head class="w-24">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each query.data as t (t.id)}
					<Table.Row>
						<Table.Cell>
							{new DateFormatter("en-US", { dateStyle: "medium" }).format(
								getLocalDate(t.date),
							)}
						</Table.Cell>
						<Table.Cell>{t.description}</Table.Cell>
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
								onclick={() => handleClickEdit(t)}
							>
								<Pencil />
							</Button>

							<Button
								title="Delete transaction"
								aria-label="delete transaction"
								variant="ghost"
								class="size-8 p-0 [&_svg]:size-3.5"
								onclick={() => (deleteDialog = { open: true, transaction: t })}
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
