<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import CategoriesCombobox from "$lib/components/categories-combobox.svelte";
	import { transactionCollection } from "$lib/db-collectons/transaction-collection";
	import DatePicker from "$lib/components/date-picker.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { upsertSubscriptionAction } from "$lib/remote/subscription.remote";
	import type { SubscriptionWithRelations } from "$lib/server/data/subscription";
	import type { NestedCategory } from "$lib/utils/category";
	import {
		CalendarDate,
		getLocalTimeZone,
		parseDate,
		today,
	} from "@internationalized/date";
	import { toast } from "svelte-sonner";

	let {
		subscription,
		wallets,
		categories,
		onSuccess,
	}: {
		subscription: SubscriptionWithRelations | null;
		wallets: { id: number; name: string }[];
		categories: NestedCategory[];
		onSuccess: () => void;
	} = $props();

	let id = $derived(subscription ? String(subscription.id) : "new");
	let form = $state(
		(() => ({
			name: subscription?.name ?? "",
			cents: subscription
				? Math.abs(subscription.cents / 100)
				: (undefined as number | undefined),
			categoryId: subscription?.categoryId ?? -1,
			walletId: subscription?.walletId ?? wallets[0]?.id ?? -1,
			dayOfMonth: subscription?.dayOfMonth ?? 1,
			startDate: (subscription
				? parseDate(subscription.startDate)
				: today(getLocalTimeZone())) as CalendarDate,
			endDate: (subscription?.endDate ? parseDate(subscription.endDate) : undefined) as
				| CalendarDate
				| undefined,
		}))(),
	);

	let startDateOpen = $state(false);
	let endDateOpen = $state(false);

	let selectedWallet = $derived(wallets.find((w) => w.id === form.walletId));
	const dayOptions = Array.from({ length: 31 }, (_, i) => ({
		value: i + 1,
		label: String(i + 1),
	}));
</script>

<form
	{...upsertSubscriptionAction.enhance(async ({ submit }) => {
		try {
			await submit();
			const res = upsertSubscriptionAction.result;
			if (!res) throw Error();
			if (res.ok) {
				toast.success(res.message);
				invalidateAll();
				transactionCollection.utils.refetch();
				onSuccess();
			} else {
				toast.error(res.message);
			}
		} catch {
			toast.error("Something went wrong. Please try again later.");
		}
	})}
>
	<div
		class="flex flex-col gap-4 py-4 [&>div]:flex [&>div]:flex-col [&>div]:justify-items-end [&>div]:gap-2"
	>
		<input type="hidden" name="id" value={id} />
		<input type="hidden" name="categoryId" value={form.categoryId} />
		<input type="hidden" name="startDate" value={form.startDate} />
		<input type="hidden" name="endDate" value={form.endDate ?? ""} />

		<div>
			<Label for="name">Name</Label>
			<Input
				required
				id="name"
				name="name"
				placeholder="Netflix, Spotify..."
				class="col-span-3"
				bind:value={form.name}
			/>
		</div>

		<div>
			<Label for="cents">Amount</Label>
			<Input
				required
				id="cents"
				type="number"
				name="cents"
				placeholder="R$ 0.00"
				step="0.01"
				class="col-span-3"
				min={0}
				bind:value={form.cents}
			/>
		</div>

		<div>
			<Label>Category</Label>
			<CategoriesCombobox
				{categories}
				value={form.categoryId}
				onChange={(c) => (form.categoryId = c)}
				style="width: 100%;"
			/>
		</div>

		<div>
			<Label>Wallet</Label>
			<Select.Root
				type="single"
				name="walletId"
				value={String(form.walletId)}
				onValueChange={(v) => (form.walletId = Number(v))}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3 w-full">
					{selectedWallet ? selectedWallet.name : "Select wallet..."}
				</Select.Trigger>
				<Select.Content>
					{#each wallets as w (w.id)}
						<Select.Item value={String(w.id)}>{w.name}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label>Day of Month</Label>
			<Select.Root
				type="single"
				name="dayOfMonth"
				value={String(form.dayOfMonth)}
				onValueChange={(v) => (form.dayOfMonth = Number(v))}
				allowDeselect={false}
			>
				<Select.Trigger class="col-span-3 w-full">
					{form.dayOfMonth}
				</Select.Trigger>
				<Select.Content>
					{#each dayOptions as opt (opt.value)}
						<Select.Item value={String(opt.value)}>{opt.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>

		<div>
			<Label>Start Date</Label>
			<DatePicker bind:open={startDateOpen} bind:date={form.startDate} />
		</div>

		<div>
			<Label>End Date (optional)</Label>
			<DatePicker bind:open={endDateOpen} bind:date={form.endDate} />
		</div>
	</div>
	<Dialog.Footer>
		<Button type="submit">Save</Button>
	</Dialog.Footer>
</form>
