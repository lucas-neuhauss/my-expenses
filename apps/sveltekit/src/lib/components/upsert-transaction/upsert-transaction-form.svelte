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
	import type { NestedCategory } from "$lib/utils/category";
	import {
		CalendarDate,
		getLocalTimeZone,
		parseDate,
		today,
	} from "@internationalized/date";
	import CategoriesCombobox from "../categories-combobox.svelte";
	import DatePicker from "../date-picker.svelte";

	let {
		transaction,
		wallets,
		categories,
		tab,
		defaultWallet,
		defaultCategory,
		onSuccess,
	}: {
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		categories: NestedCategory[];
		tab: "expense" | "income" | "transference";
		defaultWallet: number;
		defaultCategory: number;
		onSuccess: () => void;
	} = $props();

	let id = $state(transaction ? String(transaction.id) : "new");
	let calendarOpen = $state(false);
	let walletId = $state(
		transaction?.wallet.id ??
			(defaultWallet === -1 ? null : defaultWallet) ??
			wallets[0].id,
	);
	let categoryId = $state(
		transaction?.category.id ??
			(defaultCategory === -1 ? null : defaultCategory) ??
			categories[0].id,
	);

	let flatCategories = $derived(getFlatCategories(categories));
	let wallet = $derived(wallets.find((w) => w.id === walletId)!);
	let category = $derived(
		flatCategories.find((item) => item.id === categoryId) ?? categories[0],
	);

	type SelectedCategory = {
		id: number;
		name: string;
		icon: string;
	};
	function getFlatCategories(categories: NestedCategory[], hideChildren = false) {
		return categories.reduce<SelectedCategory[]>((acc, cur) => {
			acc.push(cur);
			if (cur.children && !hideChildren) {
				acc.push(...cur.children);
			}
			return acc;
		}, []);
	}

	let description = $state(transaction?.description ?? "");
	let date: CalendarDate | undefined = $state(
		transaction ? parseDate(transaction.date) : today(getLocalTimeZone()),
	);
	let cents = $state(transaction?.cents ? Math.abs(transaction.cents / 100) : undefined);
	let paid = $state(transaction?.paid ?? true);

	$effect(() => {
		// If selecting a date in the future, set "paid" to false
		if (!!date && date.compare(today(getLocalTimeZone())) > 0) {
			paid = false;
		}
	});

	const onWalletChange = (idStr: string) => {
		const id = Number(idStr);
		const selectedWallet = wallets.find((w) => w.id === id);
		if (selectedWallet) {
			walletId = id;
		}
	};
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
		<input type="hidden" name="category" value={category.id} />
		<input type="hidden" name="date" value={date} />
		<input type="hidden" name="type" value={tab} />
		<input type="hidden" name="paid" value={paid} />

		<div>
			<Label>Wallet</Label>
			<Select.Root
				type="single"
				name="wallet"
				value={String(walletId)}
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
			<CategoriesCombobox bind:value={categoryId} {categories} />
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
