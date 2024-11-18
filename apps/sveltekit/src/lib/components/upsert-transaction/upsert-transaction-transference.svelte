<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
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
		onSuccess,
	}: {
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		onSuccess: () => void;
	} = $props();

	const df = new DateFormatter("en-US", {
		dateStyle: "long",
	});

	let id = $state(transaction ? String(transaction.id) : "new");
	let fromWalletId = $state(String(transaction?.wallet.id ?? wallets[0].id));
	let toWalletId = $state(String(transaction?.transferenceTo?.walletId ?? wallets[1].id));
	let description = $state("");
	let date: CalendarDate | undefined = $state(
		transaction ? parseDate(transaction.date) : today(getLocalTimeZone()),
	);
	let cents = $state(transaction?.cents ? Math.abs(transaction.cents / 100) : undefined);
	let calendarOpen = $state(false);

	let fromWallet = $derived(wallets.find((w) => String(w.id) === fromWalletId)!);
	let toWallet = $derived(wallets.find((w) => String(w.id) === toWalletId)!);
</script>

<form
	method="post"
	action="?/upsert-transaction"
	use:enhance={({ formElement }) =>
		({ result }) => {
			if (result.type === "success") {
				onSuccess();
				invalidateAll();
				formElement.reset();
			}
		}}
>
	<div
		class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="type" value="transference" />
		<input type="hidden" name="date" value={date} />

		<div>
			<Label for="fromWallet">From Wallet</Label>
			<Select.Root
				type="single"
				name="wallet"
				bind:value={fromWalletId}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3">{fromWallet?.name}</Select.Trigger>
				<Select.Content>
					{#each wallets as wallet}
						<Select.Item value={String(wallet.id)}>
							{wallet.name}
						</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label for="toWallet">To Wallet</Label>
			<Select.Root
				type="single"
				name="toWallet"
				bind:value={toWalletId}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3">{toWallet?.name}</Select.Trigger>
				<Select.Content>
					{#each wallets as wallet}
						<Select.Item value={String(wallet.id)}>{wallet.name}</Select.Item>
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
			<Label for="cents">Cents</Label>
			<Input
				required
				id="cents"
				type="number"
				name="cents"
				placeholder="R$ 0.00"
				step="0.01"
				class="col-span-3"
				bind:value={cents}
			/>
		</div>
	</div>
	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
