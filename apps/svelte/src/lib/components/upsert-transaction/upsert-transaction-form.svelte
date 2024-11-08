<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import { Calendar } from "$lib/components/ui/calendar";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Popover from "$lib/components/ui/popover";
	import * as Select from "$lib/components/ui/select";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import { cn } from "$lib/utils.js";
	import type { NestedCategories } from "$lib/utils/category";
	import {
		CalendarDate,
		DateFormatter,
		getLocalTimeZone,
		parseDate,
		today,
	} from "@internationalized/date";
	import CalendarIcon from "svelte-radix/Calendar.svelte";

	let {
		transaction,
		wallets,
		categories,
		tab,
	}: {
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		categories: NestedCategories;
		tab: "expense" | "income";
	} = $props();

	const df = new DateFormatter("en-US", {
		dateStyle: "long",
	});

	let id = $state(transaction ? String(transaction.id) : "new");
	let calendarOpen = $state(false);
	let wallet = $state(transaction?.wallet ?? wallets[0]);
	let category = $state(transaction?.category ?? categories[0]);
	let description = $state(transaction?.description ?? "");
	let date: CalendarDate | undefined = $state(
		transaction ? parseDate(transaction.date) : today(getLocalTimeZone()),
	);
	let cents = $state(transaction?.cents ? Math.abs(transaction.cents / 100) : undefined);

	const onWalletChange = (id: string) => {
		const selectedWallet = wallets.find((w) => String(w.id) === id);
		if (selectedWallet) {
			wallet = selectedWallet;
		}
	};
	const onCategoryChange = (id: string) => {
		const selectedCategory = categories.find((c) => String(c.id) === id);
		if (selectedCategory) {
			category = selectedCategory;
		}
	};
</script>

<form method="post" action="?/upsert-transaction" use:enhance>
	<div
		class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="category" value={category.id} />
		<input type="hidden" name="date" value={date} />
		<input type="hidden" name="type" value={tab} />

		<div>
			<Label>Wallet</Label>
			<Select.Root
				type="single"
				name="wallet"
				value={String(wallet.id)}
				onValueChange={onWalletChange}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3">{wallet.name}</Select.Trigger>
				<Select.Content>
					{#each wallets as wallet}
						<Select.Item value={String(wallet.id)}>{wallet.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label>Category</Label>
			<Select.Root
				type="single"
				name="category"
				value={String(category.id)}
				onValueChange={onCategoryChange}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3">
					<div class="flex items-center gap-x-2">
						<img
							src={`/images/category/${category.iconName}`}
							alt="category icon"
							width="16"
							height="16"
						/>
						<span>{category.name}</span>
					</div>
				</Select.Trigger>
				<Select.Content>
					{#each categories as category}
						<Select.Item value={String(category.id)}>
							{category.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label for="description">Description</Label>
			<Textarea
				id="description"
				class="col-span-3"
				name="description"
				bind:value={description}
			/>
		</div>

		<div>
			<Label>Date</Label>
			<Popover.Root bind:open={calendarOpen}>
				<Popover.Trigger
					class={cn(
						buttonVariants({
							variant: "outline",
							class: "col-span-3 w-full justify-start text-left font-normal",
						}),
						!date && "text-muted-foreground",
					)}
				>
					<CalendarIcon class="mr-2 size-4" />
					{date ? df.format(date.toDate(getLocalTimeZone())) : "Pick a date"}
				</Popover.Trigger>
				<Popover.Content class="w-auto p-0" align="start">
					<Calendar
						type="single"
						bind:value={date}
						onValueChange={() => (calendarOpen = false)}
					/>
				</Popover.Content>
			</Popover.Root>
		</div>

		<div>
			<Label for="cents">Value</Label>
			<Input
				required
				id="cents"
				type="number"
				name="cents"
				placeholder="R$ 0.00"
				class="col-span-3"
				bind:value={cents}
			/>
		</div>
	</div>
	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
