<script lang="ts">
	import { enhance } from "$app/forms";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { Textarea } from "$lib/components/ui/textarea";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import type { NestedCategory } from "$lib/utils/category";
	import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
	import DatePicker from "../date-picker.svelte";
	import ExpenseIncomeSpecificInputs from "./expense-income-specific-inputs.svelte";
	import TransferenceSpecificInputs from "./transference-specific-inputs.svelte";

	let {
		transaction,
		wallets,
		categories,
		tab,
		date = $bindable(),
		defaultWallet,
		defaultCategory,
		onSuccess,
	}: {
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		categories: NestedCategory[];
		tab: "expense" | "income" | "transference";
		date: CalendarDate;
		defaultWallet: number;
		defaultCategory: number;
		onSuccess: (shouldContinue?: boolean) => void;
	} = $props();

	let walletTriggerRef = $state<HTMLButtonElement | null>(null);
	let fromWalletTriggerRef = $state<HTMLButtonElement | null>(null);
	let id = $state(transaction ? String(transaction.id) : "new");
	let calendarOpen = $state(false);

	let description = $state(transaction?.description ?? "");
	let cents = $state(transaction?.cents ? Math.abs(transaction.cents / 100) : undefined);
	let paid = $state(transaction?.paid ?? true);

	$effect(() => {
		// If selecting a date in the future, set "paid" to false
		if (!transaction && !!date && date.compare(today(getLocalTimeZone())) > 0) {
			paid = false;
		}
	});
</script>

<form
	method="post"
	action="?/upsert-transaction"
	use:enhance={() =>
		({ result, update }) => {
			if (result.type === "success") {
				const shouldContinue = result.data?.shouldContinue === true;
				update({ reset: !shouldContinue });
				onSuccess(shouldContinue);

				if (shouldContinue) {
					description = "";
					cents = undefined;

					// Focus firs form input if continuing
					walletTriggerRef?.focus();
					fromWalletTriggerRef?.focus();
				}
			}
		}}
>
	<div
		class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="type" value={tab} />
		<input type="hidden" name="date" value={date} />
		<input type="hidden" name="paid" value={paid} />

		{#if tab === "transference"}
			<TransferenceSpecificInputs bind:fromWalletTriggerRef {wallets} {transaction} />
		{:else}
			<ExpenseIncomeSpecificInputs
				bind:walletTriggerRef
				{categories}
				{transaction}
				{wallets}
				{defaultWallet}
				{defaultCategory}
			/>
		{/if}

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

		<div class="flex-row! gap-6!">
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
					min={0}
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
	<Dialog.Footer class="gap-2 sm:flex-row-reverse sm:justify-start">
		<Button type="submit">Save</Button>
		<Button
			variant="secondary"
			type="submit"
			formaction="?/upsert-transaction&continue=true"
		>
			Save and Create Another
		</Button>
	</Dialog.Footer>
</form>
