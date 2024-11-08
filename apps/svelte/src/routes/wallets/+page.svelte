<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import UpsertWalletDialog from "$lib/components/upsert-wallet/upsert-wallet-dialog.svelte";
	import { formatCurrency } from "$lib/currency";

	let { data } = $props();
</script>

<svelte:head>
	<title>Wallets - My Expenses</title>
</svelte:head>

<div class="container flex flex-col gap-y-4">
	<div>
		<UpsertWalletDialog />
	</div>

	<div class="grid grid-cols-4 gap-4 pb-4">
		{#each data.wallets as wallet}
			<Card.Root>
				<Card.Header>
					<Card.Title>{wallet.name}</Card.Title>
				</Card.Header>
				<Card.Content>
					<p>{formatCurrency(wallet.balance)}</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
