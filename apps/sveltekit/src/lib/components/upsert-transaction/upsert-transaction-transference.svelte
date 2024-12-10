<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Switch } from "$lib/components/ui/switch";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import {
		CalendarDate,
		getLocalTimeZone,
		parseDate,
		today,
	} from "@internationalized/date";
	import DatePicker from "../date-picker.svelte";

	let {
		transaction,
		wallets,
		onSuccess,
	}: {
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		onSuccess: () => void;
	} = $props();

	let id = $state(transaction ? String(transaction.id) : "new");
	let fromWalletId = $state(
		String(transaction?.transferenceFrom?.walletId ?? wallets[0].id),
	);
	let toWalletId = $state(String(transaction?.transferenceTo?.walletId ?? wallets[1].id));
	let description = $state("");
	let date: CalendarDate | undefined = $state(
		transaction ? parseDate(transaction.date) : today(getLocalTimeZone()),
	);
	let cents = $state(transaction?.cents ? Math.abs(transaction.cents / 100) : undefined);
	let paid = $state(transaction?.paid ?? true);
	let calendarOpen = $state(false);

	let fromWallet = $derived(wallets.find((w) => String(w.id) === fromWalletId)!);
	let toWallet = $derived(wallets.find((w) => String(w.id) === toWalletId)!);

	$effect(() => {
		// If selecting a date in the future, set "paid" to false
		if (!!date && date.compare(today(getLocalTimeZone())) > 0) {
			paid = false;
		}
	});
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
		<input type="hidden" name="paid" value={paid} />

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
			<DatePicker bind:open={calendarOpen} bind:date />
		</div>

		<div class="!flex-row !gap-6">
			<div class="flex flex-1 flex-col justify-items-end gap-2">
				<Label for="cents">Value</Label>
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

			<div class="mr-3 flex flex-col justify-items-end gap-2">
				<Label for="paid">Paid</Label>
				<div class="flex h-9 items-center">
					<Switch id="paid" bind:checked={paid} />
				</div>
			</div>
		</div>
	</div>
	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
