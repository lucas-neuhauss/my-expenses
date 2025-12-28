<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import type { DashboardTransaction } from "$lib/server/data/transaction";

	let {
		fromWalletTriggerRef = $bindable(),
		transaction,
		wallets,
	}: {
		fromWalletTriggerRef: HTMLButtonElement | null;
		transaction: DashboardTransaction | null;
		wallets: { id: number; name: string }[];
	} = $props();

	let fromWalletId = $state(
		(() => String(transaction?.transferenceFrom?.walletId ?? wallets[0].id))(),
	);
	let toWalletId = $state(
		(() => String(transaction?.transferenceTo?.walletId ?? wallets[1].id))(),
	);

	let fromWallet = $derived(wallets.find((w) => String(w.id) === fromWalletId)!);
	let toWallet = $derived(wallets.find((w) => String(w.id) === toWalletId)!);
</script>

<input type="hidden" name="type" value="transference" />

<div>
	<Label for="fromWallet">From Wallet</Label>
	<Select.Root
		type="single"
		name="wallet"
		bind:value={fromWalletId}
		allowDeselect={false}
	>
		<Select.Trigger bind:ref={fromWalletTriggerRef} class="w-full">
			{fromWallet?.name}
		</Select.Trigger>
		<Select.Content>
			{#each wallets as wallet (wallet.id)}
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
		<Select.Trigger class="w-full">{toWallet?.name}</Select.Trigger>
		<Select.Content>
			{#each wallets as wallet (wallet.id)}
				<Select.Item value={String(wallet.id)}>{wallet.name}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>
