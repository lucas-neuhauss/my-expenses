<script lang="ts">
	import { enhance } from "$app/forms";
	import { Calendar } from "$lib/components/ui/calendar";
	import { cn } from "$lib/utils.js";
	import { Button, buttonVariants } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import * as Popover from "$lib/components/ui/popover";
	import { Textarea } from "$lib/components/ui/textarea";
	import {
		DateFormatter,
		type DateValue,
		getLocalTimeZone,
	} from "@internationalized/date";
	import CalendarIcon from "svelte-radix/Calendar.svelte";

	let {
		wallets,
		categories,
	}: {
		wallets: { id: number; name: string }[];
		categories: { id: number; title: string; iconName: string }[];
	} = $props();

	const df = new DateFormatter("en-US", {
		dateStyle: "long",
	});

	let date: DateValue | undefined = $state();
	let wallet = $state(wallets[0]);
	let category = $state(categories[0]);
	let calendarOpen = $state(false);

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
		class="grid gap-4 py-4 [&>div]:grid [&>div]:grid-cols-4 [&>div]:items-center [&>div]:justify-items-end [&>div]:gap-4"
	>
		<input type="hidden" name="category" value={category.id} />
		<input type="hidden" name="timestamp" value={date} />
		<input type="hidden" name="type" value="expense" />

		<div>
			<Label for="wallet" class="text-right">Wallet</Label>
			<Select.Root
				type="single"
				name="wallet"
				value={String(wallet.id)}
				onValueChange={onWalletChange}
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
			<Label class="text-rigth">Category</Label>
			<Select.Root
				type="single"
				name="category"
				value={String(category.id)}
				onValueChange={onCategoryChange}
			>
				<Select.Trigger class="col-span-3">
					<div class="flex items-center gap-x-2">
						<img
							src={`/images/category/${category.iconName}`}
							alt="category icon"
							width="16"
							height="16"
						/>
						<span> {category.title}</span>
					</div>
				</Select.Trigger>
				<Select.Content>
					{#each categories as category}
						<Select.Item value={String(category.id)}>{category.title}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label for="description" class="text-right">Description</Label>
			<Textarea id="description" class="col-span-3" name="description" />
		</div>

		<div>
			<Label class="text-right">Timestamp</Label>
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
			<Label for="cents" class="text-right">Cents</Label>
			<Input
				id="cents"
				type="number"
				name="cents"
				placeholder="R$ 0.00"
				class="col-span-3"
			/>
		</div>
	</div>
	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
