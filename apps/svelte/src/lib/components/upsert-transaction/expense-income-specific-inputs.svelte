<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import type { DashboardTransaction } from "$lib/server/data/transaction";
	import type { NestedCategory } from "$lib/utils/category";
	import CategoriesCombobox from "../categories-combobox.svelte";

	let {
		walletTriggerRef = $bindable(null),
		transaction,
		wallets,
		categories,
		defaultWallet,
		defaultCategory,
	}: {
		walletTriggerRef: HTMLButtonElement | null;
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
		categories: NestedCategory[];
		defaultWallet: number;
		defaultCategory: number;
	} = $props();

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

	let wallet = $derived(wallets.find((w) => w.id === walletId)!);
	let flatCategories = $derived(getFlatCategories(categories));
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

	const onWalletChange = (idStr: string) => {
		const id = Number(idStr);
		const selectedWallet = wallets.find((w) => w.id === id);
		if (selectedWallet) {
			walletId = id;
		}
	};
</script>

<input type="hidden" name="category" value={category.id} />

<div>
	<Label>Wallet</Label>
	<Select.Root
		type="single"
		name="wallet"
		value={String(walletId)}
		onValueChange={onWalletChange}
		allowDeselect={false}
	>
		<Select.Trigger bind:ref={walletTriggerRef} class="w-full">
			{wallet.name}
		</Select.Trigger>
		<Select.Content>
			{#each wallets as wallet (wallet.id)}
				<Select.Item value={String(wallet.id)}>{wallet.name}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>

<div>
	<Label>Category</Label>
	<CategoriesCombobox bind:value={categoryId} {categories} />
</div>
